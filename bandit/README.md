`env.py` contains the environment implementation, the baseline algorithms, and our proposed bandit algorithm

running `python env.py` will generate the mean and standard deviation for simulated results of the baseline algorithms.

other files contain various experimentations in coming up with a better bandit, including the entropy based solution in `entropy_policy.py`, which is ultimately too slow to run as it requires multiple numerical integrations.

the javascript version of the bandit algorithm is located in `LARC/collection/js/bandit.js`, the only difference being in the js version, we keep track of total time spent within a task, and weigh how important a task is by a combination of uncertainty of p* and its sunken cost, avoiding sinking resources into all into one task.
