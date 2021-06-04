`env.py` contains the environment implementation, the baseline algorithms, and our proposed bandit algorithm

running `python env.py` will generate the mean and standard deviation for simulated results of the baseline algorithms.

other files contain various experimentations in coming up with a better bandit, including the entropy based solution in `entropy_policy.py`, which is ultimately too slow to run as it requires multiple numerical integrations.
