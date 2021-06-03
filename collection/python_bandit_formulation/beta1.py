import random
import numpy as np

# there are 10 casinos
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

N = 10
Budget = 100

# make N casinos, each casino_i paramterized by (a_i, opt_i)
def make_casino_params():
    OPT = [random.random() for _ in range(N)]
    return [(random.random()*o,o) for o in OPT]

class CasEnv:
    def __init__(self, casino_params):
        self.casino_params = casino_params
        self.casinos = None

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
            new_arm_mu = random.uniform(*self.casino_params[cas_id])
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
    # if a casino is empty, sample a new arm
    # otherwise, randomly pull an existing arm or get a new arm 
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

# ========== Interacting Between Env and Policy ===========
def roll_out(env, policy):
    obs = env.reset()
    for n in range(Budget):
        action = policy.act(obs)
        obs = env.step(action)
    guess = policy.guess(obs)
    return env.check_answer(guess)

if __name__ == '__main__':
    cas_par = make_casino_params()
    env = CasEnv(cas_par)
    agent = NaivePolicy()
    regret = roll_out(env, agent)
    print (regret)