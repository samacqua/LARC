# ARC-Natural-Language-Descriptions

## Dataset format

Each task has its own JSON. Each file has the general format below.

- task (by number)
    - name (name of json file of ARC task)
    - train (the IOs used to determine the pattern)
    - test (the IO used to test understanding of the pattern)
    - descriptions (all of the task's descriptions indexed by the description's ID)
        - description id
            - uid
            - description_time (time spent actually writing the description)
            - verification_time (time spent "verifying" -- trying to solve the test IO to confirm their understanding of the task)
            - timestamp
            - see_description (the part of the description starting with "In the input, you should see...")
            - do_description (the part of the description starting with "To make the output, you have to...")
            - grid_description (the part of the description starting with "The output grid size...")
            - confidence (a score from 0-10 indicating the describer's confidence that someone else, given their description, could create the correct output grid)
            - succeeded_verification (true if they created the correct output grid for the test input grid for the task after they described it)
            - num_verification_attempts (the number of attempts they took in the verification task)
            - action_sequence (all the actions the user took for the verification)
            - attempt_jsons (all of the submitted grids for the verification)
            - max_idle_time (the longest period of time the user went without any mouse movements or key presses, to the nearest 5 seconds)
            - builds (all of the description's builds, indexed by the build's ID)
                - build id
                    - num_attempts (the number of attempts the builder submitted)
                    - success (true if the builder created the correct ouput grid)
                    - uid
                    - attempt_jsons
                    - action_sequence
                    - timestamp
                    - time
                    - max_idle_time
                    
## Analysis file

`analysis.py` has some basic analysis to start looking at the data.
                    
## Other links

- [The Abstraction and Reasoning Corpus github](https://github.com/fchollet/ARC)
- [Website for going through the collected data](http://samacquaviva.com/ARC-Turks/explore/)

