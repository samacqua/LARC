import random
import numpy as np
from scipy.stats import beta
from memoization import cached

# there are N casinos
# each casino_i initially has 0 arms, however
# each casino_i is equipted with a slot-machine maker 
# assume the slot machine maker is Unif(a_i, opt_i)
# where a_i < opt_i < 1

# you can take 2 kinds of actions:
# a) go to a casino and pull from an existing machine.
#    the machine give a 0,1 outcome from Bernuli(mu)
#    where mu is the hidden parameter of the machine
#
# b) go to a casino, and pull from a new machine
#    the casino first sample a new machine mu_new ~ Unif(a_i, opt_i)
#    this machine is added to the casino permanently,
#    you receive a 0,1 outcome from Bernuli(mu_new)

# your goal is to find 1 good slot machine per casino, specifically
# give an online algorithm that, after a number of interactions
# return one slot machine from each casino: mu_1 ... mu_10
# minimizing the total "regret" :
# total_regret = (opt_1 - mu_1) + ... + (opt_10 - mu_10)

# ======== THE ENVIRONMENT MODEL =========

N = 3
Budget = 16 * N

# make N casinos, each casino_i paramterized by (a_i, opt_i)
def make_casino_params():
    def make_pair():
        a_i = random.random()
        opt_i = random.random()
        if a_i < opt_i:
            return a_i, opt_i
        else:
            return make_pair()
    return [make_pair() for _ in range(N)]

class CasEnv:
    def __init__(self, casino_params):
        self.casino_params = casino_params
        self.casinos = None

        # cache the result of sampling new arms to casinos
        self.casino_cache = dict()
        self.arm_cache = dict()

    def reset(self):
        # N empty casinos
        self.casinos = [[] for _ in range(N)]
        # initial observations at each casino
        self.ob = [[] for _ in range(N)]
        return self.ob

    def step(self, action):
        cas_id, arm_id = action
        assert arm_id in range(-1, len(self.casinos[cas_id])), "ARM NO EXIST CYKA"
        # -1 means sample new arm, so we sample one
        if arm_id == -1:

            # we use cache so the arms of the casino are consistent across different runs of the env as the first time
            # the casino cache id is the casino id, and the number of arm being tried out
            casino_cache_key = (cas_id, len(self.casinos[cas_id]))

            if casino_cache_key not in self.casino_cache:
                to_add = random.uniform(*self.casino_params[cas_id])
                self.casino_cache[casino_cache_key] = to_add

            new_arm_mu = self.casino_cache[casino_cache_key]
            self.ob[cas_id].append([])
            self.casinos[cas_id].append(new_arm_mu)

        # pull from the selected arm (-1 works nicely here lol)
        arm_result = 1 if random.random() < self.casinos[cas_id][arm_id] else 0
        self.ob[cas_id][arm_id].append(arm_result)
        return self.ob

    def check_answer(self, guess):
        total_regret = 0
        for cas_id, arm_id in enumerate(guess):
            guessed_arms_mu = 0
            if arm_id in range(len(self.casinos[cas_id])):
                guessed_arms_mu = self.casinos[cas_id][arm_id]
            opt = self.casino_params[cas_id][1]
            regret = opt - guessed_arms_mu
            total_regret += regret
        return total_regret


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
        def arm_quality(arm_ob):
            return sum(arm_ob) / len(arm_ob)
        for cas_ob in observations:
            arm_qual = [arm_quality(arm_ob) for arm_ob in cas_ob]
            ret.append(np.argmax(arm_qual))
        return ret

# ========= A Tile Strategy ===========
class TilePolicy(NaivePolicy):
    # always act on the casino with the least number of observations
    # use sqrt rule for allocate new arm, otherwise spread out evenly
    #@cached
    def act(self, observations):       
        interaction_per_cas = [sum([len(arm_ob) for arm_ob in cas_ob]) for cas_ob in observations]
        cas_id = np.argmin(interaction_per_cas)
        cas_ob = observations[cas_id]
        cas_interactions = interaction_per_cas[cas_id]
        if len(cas_ob) <= np.sqrt(cas_interactions):
            return (cas_id, -1)
        else:
            poor_arm_id = np.argmin([len(arm_ob) for arm_ob in cas_ob])
            return (cas_id, poor_arm_id)


# ========= A Jank Strategy ==========
class JankPolicy(NaivePolicy):
    # each casino fixed budget, within casino do ucb
    #@cached
    def act(self, observations):
        interaction_per_cas = [sum([len(arm_ob) for arm_ob in cas_ob]) for cas_ob in observations]
        cas_id = np.argmin(interaction_per_cas)
        cas_ob = observations[cas_id]
        cas_interactions = interaction_per_cas[cas_id]
        if len(cas_ob) <= np.sqrt(cas_interactions):
            return (cas_id, -1)
        else:
            ucbs = []
            for arm_ob in cas_ob:
                a= sum(arm_ob) + 1
                b = len(arm_ob) - a + 1
                mean, var  = beta.stats(a, b, moments='mv')
                ucbs.append(mean + np.sqrt(var))
            return (cas_id, np.argmax(ucbs))

# ========== Interacting Between Env and Policy ===========
def roll_out(env, policy):
    obs = env.reset()
    for n in range(Budget):
        action = policy.act(obs)
        obs = env.step(action)
    guess = policy.guess(obs)
    return env.check_answer(guess)

if __name__ == '__main__':
    policies = [NaivePolicy(), TilePolicy(), JankPolicy()]
    cums = [0 for _ in policies]
    for i in range(1000):
        cas_par = make_casino_params()
        env = CasEnv(cas_par)
        for j in range(len(cums)):
            policy = policies[j]
            regret = roll_out(env, policy)
            cums[j] += regret


        print (f"regret {cums}")