# Dataset 

## Tasks

The `tasks` folder contains collected data for all 400 tasks

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
                    

## Annotated Phrases

The file `annotated_phrases.csv` contains 2331 phrases from successfully communicated natural programs, of which 532 are manually tagged into 17 concepts (for detail refer to appendix section of [the paper](TODOLINK). The colomns of the csv are defined as follows:

- phrase_number : can be used to uniquely refer to each phrase (1 through 2331)
- task_number : takes value within 1 through 400, not all tasks are successfully communicated
- task_name : the unique_id for the ARC tasks (ff805c23.json)
- description_id : the unique_id assigned during annotation (441f999f-f6e8-444d-8bb6-5fbd6ab6a07a)
- phrase_kind : natural programs are organized into three sections (input, grid_size, output)
- nth_phrase_in_paragraph : for each section, the nth phrase within
- phrase : the actual phrase itself ("a blue square on the top of the right")
- tag_xxxxx : the 17 concepts, for detail see appendix section of paper

