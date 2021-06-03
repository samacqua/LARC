# Dataset 

## Raw Data

The `/tasks_json` directory contains the *raw* collected data for all 400 tasks 

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
                    
## Summary Data

The folder `/summary/` contains several csv files that _summarizes_ the raw data. It is stored in a .csv file for easier access. Certain information, such as action_sequence are omitted from this summary.

- `/summary/task.csv` : high level summary of each task
    - task_number : the task number as they appear in the training dataset of ARC (1 through 400)
    - task_name	: the unique_id for the ARC tasks (ff805c23.json)
    - test_input_size : grid size of the test input
    - test_output_size	: grid size of the test output
    - example_input_sizes : grid sizes of the example inputs
    - example_output_sizes	: grid sizes of the example outputs
    - number_of_examples : total number of example input/outputs

- `/summary/description.csv` : summary for all the descriptions
    - description_id : a unique ID assigned to each description during annotation
    - user_id : a unique identifier for the participant giving this description
    - description_input	: description paragraph of the input
    - description_output_grid_size	: description paragraph of the grid size of the output
    - description_output : description paragraph of how to construct the output
    - is_verified : could the describer validate their own description ?
    - confidence : how confident is the describer that a different builder can build from this description?
    - num_verification_attempts : how many times did the describer take to validate this description (up to 3)
    - num_actions : how many total GUI actions did the describer take in validation
    - generation : how many prior descriptions exist for this task by the time this description is given
    - user_num_prior_description_experiences : how many times did this describer describe before giving this description
    - user_num_prior_build_experiences : how many times did this describer build before giving this description
    - description_synthesis_time : how long did it take for this describer to come up with a description
    - verification_time : how long did it take for this describer to verify this description

- `/summary/build.csv` : summary of all the builds
    - build_id : a unique ID assigned to each build during annotation	
    - user_id :  a unique identifier for the participant giving this description
    - is_success : is the build successful ?
    - num_attempts : how many attempts did the builder take (up to 3)
    - num_actions : how many total GUI actions did the builder take total
    - user_num_prior_description_experiences : how many times did this builder describe before giving this description
    - user_num_prior_build_experiences	: how many times did this builder build before giving this description
    - build_time : how long did the builder spent total

- `/summary/join.csv` : relates task, description, and build together
    - task_number : the task number as they appear in the training dataset of ARC (matches the one in `task.csv`)
    - description_id : a unique ID assigned to each description during annotation (matches the one in `description.csv`)
    - build_id : a unique ID assigned to each build during annotation (matches the one in `build.csv`)

## Annotated Phrases

The file `/annotated_phrases.csv` contains 2331 phrases from successfully communicated natural programs, of which 532 are manually tagged into 17 concepts (for detail refer to appendix section of [the paper](TODOLINK). It is stored as a csv with tab seperators. The colomns of the csv are defined as follows:

- phrase_number : can be used to uniquely refer to each phrase (1 through 2331)
- task_number : the task number as they appear in the training dataset of ARC (1 through 400), not all tasks are successfully communicated
- task_name : the unique_id for the ARC tasks (ff805c23.json)
- description_id : the unique_id assigned during annotation (441f999f-f6e8-444d-8bb6-5fbd6ab6a07a)
- phrase_kind : natural programs are organized into three sections (input, grid_size, output)
- nth_phrase_in_paragraph : for each section, the nth phrase within
- phrase : the actual phrase itself ("a blue square on the top of the right")
- tag_xxxxx : the 17 concepts, for detail see appendix

