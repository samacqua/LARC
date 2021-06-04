from env import *
from entropy_policy import *

class JankPolicy2(NaivePolicy):

    def act(self, observations):
        # spread out the arm allocations evenly across casinos
        interaction_per_cas = [sum([len(arm_ob) for arm_ob in cas_ob]) for cas_ob in observations]
        cas_id = np.argmin(interaction_per_cas)

        # increase arm rule
        cas_ob = observations[cas_id]
        cas_interactions = interaction_per_cas[cas_id]
        if len(cas_ob) <= np.sqrt(cas_interactions):
            return (cas_id, -1)
        # else perform ucb on rest
        else:
            ucbs = []
            for arm_ob in cas_ob:
                # tac on an extra 1 at the end as the "prior"
                a = sum(arm_ob) + 1
                b = len(arm_ob) - a + 1
                
                # the mean and variance of a beta distribution, thank GOD it has a easy closed form
                mean = a / (a + b)
                var = a*b / ((a+b)**2 * (a+b+1))
                ucbs.append(mean + np.sqrt(var))
            return (cas_id, np.argmax(ucbs))

    def guess(self, observations):
        ret = []
        for cas_ids, cas_obs in enumerate(observations):
            ucbs = []
            for arm_ob in cas_obs:
                a= sum(arm_ob) + 1
                b = len(arm_ob) - a + 1
                mean = a / (a + b)
                var = a*b / ((a+b)**2 * (a+b+1))

                ucbs.append(mean)
            ret.append(np.argmax(ucbs))
        return ret


def get_cas_score(cas_ob):
    # if a casino has no interaction, clealry we want to sample it
    if cas_ob == []:
        return 999
    arm_means = []
    stds_arm = []
    for arm_ob in cas_ob:
        # tac on an extra 1 at the end as the "prior"
        a = sum(arm_ob) + 1
        b = len(arm_ob) - a + 1
        
        # the mean and variance of a beta distribution, thank GOD it has a easy closed form
        mean = a / (a + b)
        var = a*b / ((a+b)**2 * (a+b+1))
        std = np.sqrt(var)
        arm_means.append(mean)
        stds_arm.append(std)

    max_mean = np.max(arm_means)
    gaps = max_mean - np.array(arm_means)
    # get the std of the best arm:
    # return stds_arm[np.argmax(arm_means)]  
    # return np.std(arm_means)  
    # print (gaps)
    ret = np.sum(1 / (1 + (gaps**2)))
    
    return ret
class BestArmApproxPolicy(NaivePolicy):

    def act(self, observations):
        # chose casino where its best arm has highest uncertainty
        cas_scores = [get_cas_score(cas_ob) for cas_ob in observations]
        cas_id = np.argmax(cas_scores)

        # increase arm rule
        cas_ob = observations[cas_id]
        cas_interactions = sum([len(arm_ob) for arm_ob in cas_ob])
        if len(cas_ob) <= np.sqrt(cas_interactions):
            return (cas_id, -1)
        # else perform ucb on rest
        else:
            ucbs = []
            for arm_ob in cas_ob:
                # tac on an extra 1 at the end as the "prior"
                a = sum(arm_ob) + 1
                b = len(arm_ob) - a + 1
                
                # the mean and variance of a beta distribution, thank GOD it has a easy closed form
                mean = a / (a + b)
                var = a*b / ((a+b)**2 * (a+b+1))
                ucbs.append(mean + np.sqrt(var))
            return (cas_id, np.argmax(ucbs))

    def guess(self, observations):
        ret = []
        for cas_ids, cas_obs in enumerate(observations):
            ucbs = []
            for arm_ob in cas_obs:
                a= sum(arm_ob) + 1
                b = len(arm_ob) - a + 1
                mean = a / (a + b)
                var = a*b / ((a+b)**2 * (a+b+1))

                ucbs.append(mean)
            ret.append(np.argmax(ucbs))
        return ret

if __name__ == '__main__':

    policies = [NaivePolicy(), TilePolicy(), JankPolicy(), JankPolicy2(), BestArmApproxPolicy()]

    cums = [[] for _ in policies]

    for jj in range(1000):
        # do a roll out
        cas_par = make_casino_params()
        env = CasEnv(cas_par)
        for j in range(len(cums)):
            policy = policies[j]
            regret = roll_out(env, policy)
            cums[j].append(regret)

        stats = [(np.mean(x), np.std(x)) for x in cums]
        print (f"iteration {jj} regret_stats {stats}")