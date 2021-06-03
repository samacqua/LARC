import random
import numpy as np
from scipy.stats import beta
from memoization import cached

import matplotlib.pyplot as plt
from scipy.stats import truncnorm

# ======== THE ENVIRONMENT MODEL =========

N = 100
Budget = 16 * N

# sample a point from truncated norm
def trunc_norm_sampler(lower, upper, mu, sigma):
    X = truncnorm((lower - mu) / sigma, (upper - mu) / sigma, loc=mu, scale=sigma)
    return X.rvs()


# make N casinos, each casino_i paramterized by a truncated normal such that:
# different normal encodes different difficulties, all have 
def make_casino_params():
    # TODO : @Sam Look at this prior and see if it makes sense
    def make_param():
        # lower and upper bound to the trunction, initially 0 to 1
        lower, upper = 0, 1
        # take difficulty uniformly between 0.1 and 0.9, take spread to be 0.1 for now
        mu = np.random.uniform(0.1, 0.9)
        sigma = 0.1
        return (lower, upper, mu, sigma)
    return [make_param() for _ in range(N)]

# the casino environment has a cache to "fix the seed" in a sense between runs
# that way the comparison will be more accurate (less variance) between diff algorithms
class CasEnv:
    def __init__(self, casino_params):
        self.casino_params = casino_params
        self.casinos = None

        # cache the result of sampling new arms to casinos
        self.casino_cache = dict()
        self.arm_cache = dict()

    def get_state_repr(self, ob):
        ret = []
        for cas_ob in ob:
            if cas_ob == []:
                ret.append([])
            else:
                to_add = [(sum(x), len(x)-sum(x)) for x in cas_ob]
                ret.append(to_add)
        return ret

    def reset(self):
        # N empty casinos
        self.casinos = [[] for _ in range(N)]
        # initial observations at each casino
        self.ob = [[] for _ in range(N)]
        return self.get_state_repr(self.ob)

    def step(self, action):
        cas_id, arm_id = action
        assert arm_id in range(-1, len(self.casinos[cas_id])), "ARM NO EXIST CYKA"
        # -1 means sample new arm, so we sample one
        if arm_id == -1:

            # we use cache so the arms of the casino are consistent across different runs of the env as the first time
            # the casino cache id is the casino id, and the number of arm being tried out
            casino_cache_key = (cas_id, len(self.casinos[cas_id]))

            if casino_cache_key not in self.casino_cache:
                to_add = trunc_norm_sampler(*self.casino_params[cas_id])
                self.casino_cache[casino_cache_key] = to_add

            new_arm_mu = self.casino_cache[casino_cache_key]
            self.ob[cas_id].append([])
            self.casinos[cas_id].append(new_arm_mu)

        # pull from the selected arm (-1 works nicely here lol)
        arm_result = 1 if random.random() < self.casinos[cas_id][arm_id] else 0
        self.ob[cas_id][arm_id].append(arm_result)
        return self.get_state_repr(self.ob)

    def check_answer(self, guess):
        total_reward = 0
        for cas_id, arm_id in enumerate(guess):
            guessed_arms_mu = 0
            if arm_id in range(len(self.casinos[cas_id])):
                guessed_arms_mu = self.casinos[cas_id][arm_id]
            total_reward += guessed_arms_mu
        return total_reward / N


# ========= A Naive Policy ==========
class NaivePolicy:

    # for faster computation, cache the state-action pair
    def __init__(self):
        self.cache = dict()

    # if a casino is empty, sample a new arm
    # otherwise, randomly pull an existing arm or get a new arm
    #@cached 
    def act(self, observations):
        for cas_id, cas in enumerate(observations):
            if len(cas) == 0:
                return (cas_id, -1)
        rand_id = random.choice([_ for _ in range(N)])
        rand_arm = random.choice([_ for _ in range(-1, len(observations[rand_id]))])            
        return (rand_id, rand_arm)

    def guess(self, observations):
        ret = []
        for cas_ids, cas_obs in enumerate(observations):
            ucbs = []
            for (a,b) in cas_obs:
                a, b = a+1, b+1
                mean = a / (a + b)
                var = a*b / ((a+b)**2 * (a+b+1))

                ucbs.append(mean)
            ret.append(np.argmax(ucbs))
        return ret

# ========= A Tile Strategy ===========
class TilePolicy(NaivePolicy):
    # always act on the casino with the least number of observations
    # use sqrt rule for allocate new arm, otherwise spread out evenly
    #@cached
    def act(self, observations):       
        interaction_per_cas = [sum([sum(arm_ob) for arm_ob in cas_ob]) for cas_ob in observations]
        cas_id = np.argmin(interaction_per_cas)
        cas_ob = observations[cas_id]
        cas_interactions = interaction_per_cas[cas_id]
        if len(cas_ob) <= np.sqrt(cas_interactions):
            return (cas_id, -1)
        else:
            poor_arm_id = np.argmin([sum(arm_ob) for arm_ob in cas_ob])
            return (cas_id, poor_arm_id)


# ========= A Jank Strategy ==========
class JankPolicy(NaivePolicy):
    # each casino fixed budget, within casino do ucb
    #@cached
    def act(self, observations):
        interaction_per_cas = [sum([sum(arm_ob) for arm_ob in cas_ob]) for cas_ob in observations]
        cas_id = np.argmin(interaction_per_cas)
        cas_ob = observations[cas_id]
        cas_interactions = interaction_per_cas[cas_id]
        if len(cas_ob) <= np.sqrt(cas_interactions):
            return (cas_id, -1)
        else:
            ucbs = []
            for (a,b) in cas_ob:
                a = a + 1
                b = b + 1
                mean = a / (a + b)
                var = a*b / ((a+b)**2 * (a+b+1))
                ucbs.append(mean + np.sqrt(var))
            return (cas_id, np.argmax(ucbs))

# ========= A Jank Strategy ==========
class AdaptPolicy(NaivePolicy):
    # select casino rule : pick casino with highest arm var of best arm
    def casino_scores(self, obs):
        # @sam for you this should be the total minutes spent (adjusted by removing outliers)
        # for this mock-up, for each casino, get its total number of interactions as efforts 
        # i.e. each interaction (build or describe) takes 1 minutes effectively
        total_efforts = [sum([sum(arm_ob) for arm_ob in cas_obs]) + 1 for cas_obs in obs]
        avg_efforts = np.mean(total_efforts)
        efforts_ratio = [x / avg_efforts for x in total_efforts]

        cas_scores = []
        for cas_id, cas_obs in enumerate(obs):

            if cas_obs == []:
                cas_obs = [(0,0)]

            best_arms = []
            for (a,b) in cas_obs:
                a = a + 1
                b = b + 1
                mean = a / (a+b)
                best_arms.append(mean)

            best_arm_id = np.argmax(best_arms)
            best_a, best_b = cas_obs[best_arm_id]
            a = best_a + 1
            b = best_b + 1
            var = a*b / ((a+b)**2 * (a+b+1))

            # adjust the benefits – the variance – with the current efforts spend
            # doing so ensures that no single task would be too heavily dependent on
            the_score = var / efforts_ratio[cas_id]
            cas_scores.append(the_score)
        return cas_scores

    # get casino difficulty : estimated as the mean of the best arm
    def best_cas_mean(self, cas_obs):
        if cas_obs == []:
            cas_obs = [(1,1)]

        best_arms = []
        for (a,b) in cas_obs:
            mean = a / (a+b)
            best_arms.append(mean)

        return max(best_arms)

    def act(self, observations):
        # print (observations)
        # selecting a casino
        cas_scores = self.casino_scores(observations)
        cas_id = np.argmax(cas_scores)

        # within a specific casino, do something
        cas_ob = observations[cas_id]
        cas_interactions = sum([sum(arm_ob) for arm_ob in cas_ob])
        best_arm_mean = self.best_cas_mean(cas_ob)

        difficulty = 1 - best_arm_mean

        # if this inequality holds, increase arm : i.e. more difficult = more arms
        if len(cas_ob) <= cas_interactions ** difficulty:
            return (cas_id, -1)
        else:
            ucbs = []
            for (a,b) in cas_ob:
                a = a + 1
                b = b + 1
                mean = a / (a + b)
                var = a*b / ((a+b)**2 * (a+b+1))
                ucbs.append(mean + np.sqrt(var))
            candidate_arm_id = np.argmax(ucbs)
            # filter out pulling (0,r) arms, i.e. arm that has only failures inside
            if cas_ob[candidate_arm_id][0] == 0:
                candidate_arm_id = -1
            return cas_id, candidate_arm_id

# ========= A Jank Strategy ==========
class AdaptPolicy2(NaivePolicy):
    # select casino rule : pick casino with highest arm var of best arm
    def casino_scores(self, obs):
        # @sam for you this should be the total minutes spent (adjusted by removing outliers)
        # for this mock-up, for each casino, get its total number of interactions as efforts 
        # i.e. each interaction (build or describe) takes 1 minutes effectively
        total_efforts = [sum([sum(arm_ob) for arm_ob in cas_obs]) + 1 for cas_obs in obs]
        avg_efforts = np.mean(total_efforts)
        efforts_ratio = [x / avg_efforts for x in total_efforts]

        cas_scores = []
        for cas_id, cas_obs in enumerate(obs):

            if cas_obs == []:
                cas_obs = [(0,0)]

            best_arms = []
            for (a,b) in cas_obs:
                a = a + 1
                b = b + 1
                mean = a / (a+b)
                best_arms.append((mean, a, b))

            sorted_arms = sorted(best_arms)
            # get the latter half
            better_half = sorted_arms[len(best_arms) // 2 :]
            best_a = sum([x[0] for x in better_half])
            best_b = sum([x[1] for x in better_half])
            a = best_a + 1
            b = best_b + 1
            var = a*b / ((a+b)**2 * (a+b+1))

            # adjust the benefits – the variance – with the current efforts spend
            # doing so ensures that no single task would be too heavily dependent on
            the_score = var / efforts_ratio[cas_id]
            cas_scores.append(the_score)
        return cas_scores

    # get casino difficulty : estimated as the mean of the best arm
    def best_cas_mean(self, cas_obs):
        if cas_obs == []:
            cas_obs = [(1,1)]

        best_arms = []
        for (a,b) in cas_obs:
            mean = a / (a+b)
            best_arms.append(mean)

        return max(best_arms)

    def act(self, observations):
        # print (observations)
        # selecting a casino
        cas_scores = self.casino_scores(observations)
        cas_id = np.argmax(cas_scores)

        # within a specific casino, do something
        cas_ob = observations[cas_id]
        cas_interactions = sum([sum(arm_ob) for arm_ob in cas_ob])
        best_arm_mean = self.best_cas_mean(cas_ob)

        difficulty = 1 - best_arm_mean

        # if this inequality holds, increase arm : i.e. more difficult = more arms
        if len(cas_ob) <= cas_interactions ** difficulty:
            return (cas_id, -1)
        else:
            ucbs = []
            for (a,b) in cas_ob:
                a = a + 1
                b = b + 1
                mean = a / (a + b)
                var = a*b / ((a+b)**2 * (a+b+1))
                ucbs.append(mean + np.sqrt(var))
            candidate_arm_id = np.argmax(ucbs)
            # filter out pulling (0,r) arms, i.e. arm that has only failures inside
            if cas_ob[candidate_arm_id][0] == 0:
                candidate_arm_id = -1
            return cas_id, candidate_arm_id

# ========== Interacting Between Env and Policy ===========
def roll_out(env, policy):
    obs = env.reset()
    for n in range(Budget):
        action = policy.act(obs)
        obs = env.step(action)
    guess = policy.guess(obs)
    return env.check_answer(guess)

if __name__ == '__main__':

    policies = [NaivePolicy(), TilePolicy(), JankPolicy(), AdaptPolicy(), AdaptPolicy2()]
    cums = [0 for _ in policies]
    for i in range(100):
        cas_par = make_casino_params()
        env = CasEnv(cas_par)
        for j in range(len(cums)):
            policy = policies[j]
            reward = roll_out(env, policy)
            cums[j] += reward


        print (f"gainz {cums}")