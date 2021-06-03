from env import *
from scipy import integrate
from scipy.stats import entropy
from copy import deepcopy

# normalization trix from tim viera blog
def exp_normalize(x):
    b = x.max()
    y = np.exp(x - b)
    return y / y.sum()

K_DIS = 5
        
# this is just the hypothesis space, which is same for every casino
H_SPACE = []
for i in range(1, K_DIS+1):
    for j in range(i):
        RNG = (j/K_DIS, i/K_DIS)
        H_SPACE.append(RNG)

class EntPolicy(NaivePolicy):

    # given observatio of a casino, i.e. [[1,0,0],[1,1,1]]
    # produce the posterior of hypothesis Ranges given these observations
    def get_posterior_R(self, cas_obs):
        loglikelihoood = []
        # for all the discrete range hypothesis of a casino
        for R in H_SPACE:
            R_loglikelihood = 0
            P_theta_R = 1 / (R[1] - R[0])
            # for all the arm obserrvations in that casino
            for arm_obs in cas_obs:
                arm_heads = sum(arm_obs)
                arm_tails = len(arm_obs) - arm_heads
                def likelihoood_armobs_theta(theta):
                    return theta**arm_heads * (1-theta)**arm_tails
                likelihood_armobs_omega = P_theta_R * integrate.quad(likelihoood_armobs_theta, R[0], R[1])[0]
                R_loglikelihood += np.log(likelihood_armobs_omega)
            loglikelihoood.append(R_loglikelihood)
        # exponentiate and normalise into normal probabilities
        loglikelihoood = np.array(loglikelihoood)
        return exp_normalize(loglikelihoood)

    # given distribution of R, get the distribution of max
    # we do so normalizing away the a in (a, OPT)
    def get_distribution_Opt(self, distr_R):
        buckets = [0.0 for _ in range(K_DIS)]
        for prob, R in zip(distr_R, H_SPACE):
            buckets[round(R[1] * K_DIS) - 1] += prob
        return buckets

    # get the distribution of theta given a distribution of ranges R
    def get_distribution_theta(self, distr_R):
        buckets = [0.0 for _ in range(K_DIS)]
        for prob, R in zip(distr_R, H_SPACE):
            low_idx =  round(R[0] * K_DIS)    
            high_idx = round(R[1] * K_DIS)
            for idx in range(low_idx, high_idx):
                buckets[idx] += prob * (1 / (R[1] - R[0]))      
        pdf_info = np.array(buckets)
        def theta_distr(theta):
            bucket_id = int(theta * K_DIS)
            return pdf_info[bucket_id]
        return theta_distr

    # get the predition of whether an arm in a casino would be 1 or 0
    def get_arm_pred(self, arm_id, cas_obs):
        assert arm_id == -1 or arm_id in range(len(cas_obs))

        # self arm's outcomes
        self_arm_outcomes = [] if arm_id == -1 else cas_obs[arm_id]
        # other arm's outcomes
        other_arm_obs = [cas_obs[j] for j in range(len(cas_obs)) if j != arm_id]
        
        # compute the posterior of R given other arm's observation
        R_posterior = self.get_posterior_R(other_arm_obs)
        # compute the theta posterior given other_arms_obs
        theta_posterior = self.get_distribution_theta(R_posterior)
        # print ("mark 1")
        # print (self_arm_outcomes, other_arm_obs)
        # print (sum(R_posterior))
        # print (theta_posterior)
        # print (integrate.quad(theta_posterior, 0, 1))

        # if we're pulling from a new arm, V2 is already computed
        V2 = theta_posterior if arm_id == -1 else None

        if V2 is None:
            # if we're pulling an existing arm, we need to encorporate in existing arm's outcomes
            def V1(theta):
                arm_heads = sum(self_arm_outcomes)
                arm_tails = len(self_arm_outcomes) - arm_heads
                return theta**arm_heads * (1-theta)**arm_tails * theta_posterior(theta)
            # the Z1 normalization constant
            Z1 = integrate.quad(V1, 0, 1)[0]
            # the V2 all put together
            def V22(theta):
                return V1(theta) / Z1
            V2 = V22

        def H_likelihood(theta):
            return V2(theta) * theta
        def T_likelihood(theta):
            return V2(theta) * (1-theta)

        # quiote useful debugging, do not remove 
        # if abs(integrate.quad(V2, 0, 1)[0] - 1.0) > 0.1:
        #     print (integrate.quad(V2, 0, 1))
        #     print (cas_obs)
        #     print (arm_id)
        #     assert 0, "something wrong with my posterior . . ."

        H_prob = integrate.quad(H_likelihood, 0, 1)[0]
        # T_prob = integrate.quad(T_likelihood, 0, 1)[0]
        T_prob = 1.0 - H_prob
        return H_prob, T_prob
        

    def act(self, observations):
        # print ("acting ")
        # print ("observations")
        # print (observations)
        # ret = super().act(observations)
        
        actions = []
        entropy_reductions = []

        for cas_ids, cas_obs in enumerate(observations):
            posterior_R = self.get_posterior_R(cas_obs)
            posterior_Opt = self.get_distribution_Opt(posterior_R)
            opt_entropy = entropy(posterior_Opt) 

            # print (f"casino {cas_ids}   obs {cas_obs}")
            for arm_id in [-1] + [_ for _ in range(len(cas_obs))]:
                H_prob, T_prob = self.get_arm_pred(arm_id, cas_obs)
                
                # entropy on opt if head is tossed
                hallucinate_head = deepcopy(cas_obs)
                if arm_id == -1:
                    hallucinate_head.append([1])
                else:
                    hallucinate_head[arm_id].append(1)
                opt_distr_if_head = self.get_distribution_Opt(self.get_posterior_R(hallucinate_head))
                head_ent = entropy(opt_distr_if_head)

                # entropy on opt if tail is tossed
                hallucinate_tail = deepcopy(cas_obs)
                if arm_id == -1:
                    hallucinate_tail.append([0])
                else:
                    hallucinate_tail[arm_id].append(0)
                opt_distr_if_tail = self.get_distribution_Opt(self.get_posterior_R(hallucinate_tail))
                tail_ent = entropy(opt_distr_if_tail)

                opt_cond_entropy = H_prob * head_ent + T_prob * tail_ent

                actions.append((cas_ids, arm_id))
                entropy_reductions.append(opt_entropy - opt_cond_entropy)

        # return the action with the least conditional entropy of opt
        chosen_action = actions[np.argmax(entropy_reductions)]
        # print ("chosen action ", chosen_action)
        return chosen_action

    def guess(self, observations):

        ret = []
        for cas_ids, cas_obs in enumerate(observations):
            arm_probs = [self.get_arm_pred(arm_id, cas_obs)[0] for arm_id in range(len(cas_obs))]
            #print (arm_probs)
            #assert 0
            ret.append(np.argmax(arm_probs))
        return ret

if __name__ == '__main__':

    policies = [NaivePolicy(), TilePolicy(), JankPolicy(), EntPolicy()]

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