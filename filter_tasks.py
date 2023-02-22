import pandas as pd
import numpy as np
import json


def reject_outliers(data, m=2):
    return data[abs(data - np.mean(data)) < m * np.std(data)]


def main():

    N_EXAMPLES = (3, 8)
    MIN_SUC_BUILDS = 1
    MAX_GRID_SIZE = 5
    GOAL_N_TASKS = 40

    ### Load the dataframes. ###
    task_df = pd.read_csv('dataset/summary/task.csv')
    build_df = pd.read_csv('dataset/summary/build.csv')
    description_df = pd.read_csv('dataset/summary/description.csv')
    join_df = pd.read_csv('dataset/summary/join.csv')
    print("N tasks:", len(task_df))

    ### Add data to join each. ###

    # Map build to its description and vice versa.
    build_to_desc = {}
    desc_to_builds = {}
    for _, build in build_df.iterrows():
        build_id = build.build_id
        join_build_row = join_df[join_df.build_id == build_id]
        desc_id = join_build_row.description_id.item()
        
        build_to_desc[build_id] = desc_id
        desc_to_builds.setdefault(desc_id, []).append(build_id)
    build_df['description_id'] = build_df['build_id'].map(build_to_desc)
    description_df['builds'] = description_df['description_id'].map(desc_to_builds)

    # Map description to its task and vice versa.
    desc_to_task = {}
    task_to_descs = {}
    task_to_best_desc = {}  # Also map to desc with highest number of successful builds.
    task_to_best_desc_score = {}

    for _, desc in description_df.iterrows():
        desc_id = desc.description_id
        join_desc_row = join_df[join_df.description_id == desc_id].iloc[0]
        task_id = join_desc_row.task_id.item()
        
        desc_to_task[desc_id] = task_id
        task_to_descs.setdefault(task_id, []).append(desc_id)

        # Map from the task to its best build description.
        n_suc_builds = 0
        for build in desc_to_builds.get(desc.description_id, []):
            if build_df[build_df.build_id == build].is_success.item():
                n_suc_builds += 1
        
        old_best = task_to_best_desc_score.get(task_id, 0)
        task_to_best_desc_score[task_id] = max(old_best, n_suc_builds)
        if n_suc_builds > old_best:
            task_to_best_desc[task_id] = [desc.description_id]
        elif n_suc_builds == old_best:
            task_to_best_desc.setdefault(task_id, []).append(desc.description_id)

    description_df['task_id'] = description_df['description_id'].map(desc_to_task)
    task_df['descriptions'] = task_df['task_id'].map(task_to_descs)
    
    ### Filter by number of examples. ###
    task_df['n_exs'] = task_df.apply(lambda x: len(eval(x['example_input_sizes'])), axis=1)
    task_df = task_df[(task_df['n_exs'] >= N_EXAMPLES[0]) & (task_df['n_exs'] <= N_EXAMPLES[1])]
    print("N tasks where ...:")
    print(f"\t{N_EXAMPLES[0]} >= n_ex >= {N_EXAMPLES[1]}:", len(task_df))

    ### Filter by number of successful builds. ###
    desc_n_successful_builds = []
    desc_n_builds = []
    for _, row in description_df.iterrows():

        n_success = 0
        builds = row.builds if isinstance(row.builds, list) else []
        for build_id in builds:
            build = build_df[build_df.build_id == build_id]
            if build.is_success.item():
                n_success += 1

        desc_n_successful_builds.append(n_success)
        desc_n_builds.append(len(builds))

    description_df['n_successful_builds'] = desc_n_successful_builds
    description_df['n_builds'] = desc_n_builds
    task_df['best_desc_suc_builds'] = description_df.groupby('task_id')['n_successful_builds'].max()
    task_df = task_df[task_df['best_desc_suc_builds'] >= MIN_SUC_BUILDS]
    print(f"\tand num successful builds >= {MIN_SUC_BUILDS}:", len(task_df))

    ### Filter by grid size. ###
    task_df['test_x'] = task_df['test_output_size'].apply(lambda x: int(eval(x)[0]))
    task_df['test_y'] = task_df['test_output_size'].apply(lambda x: int(eval(x)[1]))
    # task_df_by_grid_size = task_df[(task_df['test_x'] <= MAX_GRID_SIZE) & (task_df['test_y'] <= MAX_GRID_SIZE)]
    # print(f"\tand N grid size <= {MAX_GRID_SIZE}x{MAX_GRID_SIZE}", len(task_df_by_grid_size))

    area_to_dims = {}
    min_area = float('inf')
    for x in range(10):
        for y in range(10):
            tasks_with_size = task_df[(task_df['test_x'] < x) & (task_df['test_y'] < y)]
            n_tasks_with_size = len(tasks_with_size)
            if n_tasks_with_size > GOAL_N_TASKS:
                min_area = min(min_area, x*y)
                area_to_dims[x*y] = (x, y, n_tasks_with_size, tasks_with_size)

    x, y, n_tasks, tasks_with_size = area_to_dims[min_area]
    print(f"\nsmallest grid size to have >= {GOAL_N_TASKS} tasks: {x} x {y} ({n_tasks} / {len(task_df)} tasks)")
    print(f"list of all tasks and best description (or list if tie) to have less than {x} x {y} dimensions:")

    # Print out all tasks that have area smaller than the area needed.
    for _, task in tasks_with_size.sort_values(by='task_id').iterrows():
        print(f'\ttask {task.task_id} ({task.test_x} x {task.test_y}): desc={task_to_best_desc[task.task_id]}')

    ### Calculate minimum number of changes necessary to have GOAL_N_TASKS tasks. ###
    n_changes = {}
    for _, row in task_df.iterrows():
        with open(f'dataset/tasks_json/{row.task_id}.json', 'r') as f:
            task_json = json.load(f)

        ingrid = np.array(task_json['test'][0]['input'])
        outgrid = np.array(task_json['test'][0]['output'])

        # Calculate the number of changes necessary, assuming you can start from the input grid
        # or from a blank grid.
        shapes_match = ingrid.shape == outgrid.shape
        n_task_changes_from_in = np.sum(ingrid != outgrid) if shapes_match else float('inf')    # Can't copy from input if shapes don't match.
        n_task_changes_from_blank = np.sum(outgrid != 0) + int(outgrid.shape != (3, 3))     # Must reshape grid = 1 more change.
        n_changes[row.task_id] = min(n_task_changes_from_in, n_task_changes_from_blank)

    task_df_by_changes = task_df.copy()
    task_df_by_changes['n_changes'] = task_df_by_changes['task_id'].map(n_changes)
    task_df_by_changes = task_df_by_changes.sort_values(by='n_changes', ascending=True)
    smallest_n_changes = task_df_by_changes.iloc[GOAL_N_TASKS-1].n_changes
    task_df_by_changes = task_df_by_changes[task_df_by_changes['n_changes'] <= smallest_n_changes]
    print(f"\nsmallest number of changes to have >= {GOAL_N_TASKS} tasks ({len(task_df_by_changes)} / {len(task_df)} tasks):", smallest_n_changes)
    print(f"list of all tasks and best description (or list if tie) to have less than {smallest_n_changes} changes:")
    for _, task in task_df_by_changes.sort_values(by='task_id').iterrows():
        print(f'\ttask {task.task_id}: desc={task_to_best_desc[task.task_id]}')

    ### Get time data on the filtered tasks / descriptions. ###
    validation_times = []
    build_times = []
    build_times_suc = []

    for _, row in task_df.iterrows():
        task_descs = description_df[description_df.task_id == row.task_id]
        task_best_descs = task_descs[task_descs.n_successful_builds == row.best_desc_suc_builds]

        for _, desc in task_best_descs.iterrows():
            validation_times.append(desc.verification_time)

            for _, build in build_df[build_df.description_id == desc.description_id].iterrows():
                build_times.append(build.build_time)
                if build.is_success:
                    build_times_suc.append(build.build_time)

    ### Summarize time data. ###
    validation_times = reject_outliers(np.array(validation_times), m=2)
    build_times = reject_outliers(np.array(build_times), m=2)

    print(f"\nValidation time (s): {validation_times.mean():.2f}, std={validation_times.std():.2f}")
    print(f"Build time (s): {build_times.mean():.2f}, std={build_times.std():.2f}")

    build_times_suc = reject_outliers(np.array(build_times_suc), m=2)
    print(f"Build time successful builds (s): {build_times_suc.mean():.2f}, std={build_times_suc.std():.2f}")

if __name__ == "__main__":
    main()
