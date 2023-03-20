import json
import subprocess

def write_to_clipboard(output):
    process = subprocess.Popen(
        'pbcopy', env={'LANG': 'en_US.UTF-8'}, stdin=subprocess.PIPE)
    process.communicate(output.encode('utf-8'))


def get_task_ios(task_num: int):
    with open(f'dataset/tasks_json/{task_num}.json', 'r') as f:
        task = json.load(f)
    return task["train"], task["test"]


def get_task_name(task_num: int):
    with open(f'dataset/tasks_json/{task_num}.json', 'r') as f:
        task = json.load(f)
    return task["name"]


def get_task_best_desc(task_num: int):
    with open(f'dataset/tasks_json/{task_num}.json', 'r') as f:
        task = json.load(f)

    # Get the description with the most successes.
    best_desc = None
    best_desc_n_success = 0
    for desc_id, desc in task['descriptions'].items():
        desc_n_success = sum(build['success'] for build in desc["builds"].values())
        if desc_n_success > best_desc_n_success:
            best_desc = desc['do_description']
            best_desc_n_success = desc_n_success
    return best_desc.replace('...', ' ').replace('.', '. ').replace('  ', ' ') if best_desc else None


def pp_grid(grid):
    return '\n'.join(' '.join(str(x) for x in col) for col in grid)


def build_prompt_base():
    return ("You are trying to find the abstract pattern that maps an input grid to an output grid. "
            "You are shown examples of the input-output pairs that follow the pattern, as well as a description that describes the pattern. "
            "Your job is to use the input-output examples and the description of the pattern to generate a list of functions that can be put together to create the output grid from the input grid. "
            "Then, you will use this list of functions to generate python code to make the solution."
            "Note that, in the input-output examples, 0 represents black, 1 represents dark blue, 2 represents red, 3 represents green, 4 represents yellow, 5 represents grey, 6 represents pink, 7 represents orange, 8 represents light blue / teal, and 9 represents brown / dark red.")


def build_prompt_example():

    # TASK 1

    prompt = "\n\I will give you 3 examples of the task you are supposed to do. If you understand the task, respond with 'Yes', and I will give you the pattern to solve."
    prompt += "\n=== Pattern 0 ===\n\nEXAMPLES:"
    task_num = 1
    train_ios, test_ios = get_task_ios(task_num)
    for i, task_io in enumerate(train_ios):
        prompt += f"\n\nExample {i+1}:"
        prompt += f"\nInput:\n{pp_grid(task_io['input'])}"
        prompt += f"\nOutput:\n{pp_grid(task_io['output'])}"

    # Add the task description to the prompt.
    task_desc = get_task_best_desc(task_num)
    prompt += f"\n\nDESCRIPTION:"
    prompt += f"\n\n{task_desc}"

    prompt += "\n\nANSWER:\n"
    prompt += "Remember: your job is to first generate the list of functions for Pattern 0, and then use those functions to solve the task."
    prompt += "\n[chatGPT]:"

    prompt += ("\nThe functions needed to solve this pattern are:"
               "\n- fill(matrix, List[indices], color) -> matrix: fill the cells at the given indices with the given color."
               "\n- get_enclosed(matrix, color) -> List[indices]: gets the indices of the squares in the matrix that are fully surrounded by the given color.")
    prompt += ("\n\nUsing these functions, the solution program is:\n"
               "def solution(matrix):"
               "\n  enclosed_indices = get_enclosed(matrix, 3)    # get the indices of the squares that are fully surrounded by green"
               "\n  matrix = fill(matrix, enclosed_indices, 4)   # fill the squares that are fully surrounded by green with yellow"
               "\n  return matrix")

    # TASK 9

    prompt += "\n=== Pattern 1 ===\n\nEXAMPLES:"

    task_num = 9
    train_ios, test_ios = get_task_ios(task_num)
    for i, task_io in enumerate(train_ios):
        prompt += f"\n\nExample {i+1}:"
        prompt += f"\nInput:\n{pp_grid(task_io['input'])}"
        prompt += f"\nOutput:\n{pp_grid(task_io['output'])}"

    # Add the task description to the prompt.
    task_desc = get_task_best_desc(task_num)
    prompt += f"\n\nDESCRIPTION:"
    prompt += f"\n\n{task_desc}"

    prompt += "\n\nANSWER:\n"
    prompt += "Remember: your job is to first generate the list of functions for Pattern 1, and then use those functions to solve the task."
    prompt += "\n[chatGPT]:"

    prompt += ("\nThe functions needed to solve this pattern are:"
               "\n- get_continuous_objs(matrix -> List[List[indices]]: gets a list of the objects in the matrix that are connected by color"
               "\n- sort_by_height(List[List[indices]] -> List[List[indices]]: sorts a list of objects by height (shortest to tallest)"
               "\n- fill(matrix, List[indices], color) -> matrix: fill the cells at the given indices with the given color.")
    prompt += ("\n\nUsing these functions, the solution program is:\n"
               "\ndef solution(matrix):"
               "\n  objs = get_continuous_objs(matrix)    # get the objects in the matrix" 
               "\n  objs = sort_by_height(objs)        # sort the objects by height"
               "\n  matrix = fill(matrix, objs[0], 4)   # fill the shortest object with yellow"
               "\n  matrix = fill(matrix, objs[1], 3)   # fill the next shortest object with green"
               "\n  matrix = fill(matrix, objs[2], 2)   # fill the next shortest object with red"
               "\n  matrix = fill(matrix, objs[3], 1)   # fill the tallest object with dark blue"
               "\n  return matrix")
    
    # TASK 15
    prompt += "\n=== Pattern 2 ===\n\nEXAMPLES:"

    task_num = 15
    train_ios, test_ios = get_task_ios(task_num)
    for i, task_io in enumerate(train_ios):
        prompt += f"\n\nExample {i+1}:"
        prompt += f"\nInput:\n{pp_grid(task_io['input'])}"
        prompt += f"\nOutput:\n{pp_grid(task_io['output'])}"

    # Add the task description to the prompt.
    task_desc = get_task_best_desc(task_num)
    prompt += f"\n\nDESCRIPTION:"
    prompt += f"\n\n{task_desc}"

    prompt += "\n\nANSWER:\n"
    prompt += "Remember: your job is to first generate the list of functions for Pattern 2, and then use those functions to solve the task."
    prompt += "\n[chatGPT]:"

    prompt += ("\nThe functions needed to solve this pattern are:"
               "\n- get_color(matrix, color) -> List[indices]: gets a list of the indices in the matrix that are the given color"
               "\n- fill(matrix, List[indices], color) -> matrix: fill the cells at the given indices with the given color.")
    prompt += ("\n\nUsing these functions, the solution program is:\n"
               "\ndef solution(matrix):"
               "\n  dark_red_indices = get_color(matrix, 9)    # get the dark red indices" 
               "\n  pink_indices = get_color(matrix, 6)    # get the dark red indices" 
               "\n  green_indices = get_color(matrix, 3)    # get the green indices" 
               "\n  yellow_indices = get_color(matrix, 4)    # get the green indices" 
               "\n  dark_blue_indices = get_color(matrix, 1)    # get the dark blue indices" 
               "\n  grey_indices = get_color(matrix, 5)    # get the grey indices" 
               "\n  light_blue_indices = get_color(matrix, 8)    # get the light blue indices" 
               "\n  dark_red_indices = get_color(matrix, 9)    # get the dark red indices" 

               "\n  matrix = fill(matrix, dark_red_indices, 6)   # change dark red to pink"
               "\n  matrix = fill(matrix, pink_indices, 9)   # change pink to dark red"
               "\n  matrix = fill(matrix, green_indices, 4)   # change green to yellow"
               "\n  matrix = fill(matrix, yellow_indices, 3)   # change yellow to green"
               "\n  matrix = fill(matrix, dark_blue_indices, 5)   # change dark blue to grey"
               "\n  matrix = fill(matrix, grey_indices, 1)   # change grey to dark blue"
               "\n  matrix = fill(matrix, light_blue_indices, 9)   # change light blue to dark red"
               "\n  matrix = fill(matrix, dark_red_indices, 8)   # change dark red to light blue"

               "\n  return matrix")

    return prompt


def build_prompt_fewshot(task_num: int):
    # Build the intro to the prompt.
    prompt = build_prompt_base()

    # Add few-shot examples.
    prompt += build_prompt_example()

    prompt += "\n\nRemember that these 3 examples are only examples. You should follow the answer format, but you will be solving a new pattern."
    prompt += "\n\nAfter these three examples, do you understand what I want you to do? If so, answer yes and I will give you a new pattern to solve."
    prompt1 = prompt

    # Add the task examples to the prompt.
    train_ios, test_ios = get_task_ios(task_num)
    prompt = "\n\n=== Pattern 3 (Your turn) ===\n\nEXAMPLES:"
    for i, task_io in enumerate(train_ios):
        prompt += f"\n\nExample {i+1}:"
        prompt += f"\nInput:\n{pp_grid(task_io['input'])}"
        prompt += f"\nOutput:\n{pp_grid(task_io['output'])}"

    # Add the task description to the prompt.
    task_desc = get_task_best_desc(task_num)
    if task_desc is None:
        raise ValueError("No description for task " + str(task_num))
    
    prompt += f"\n\nDESCRIPTION:"
    prompt += f"\n{task_desc}"

    # # Add the task test input to the prompt.
    # prompt += "\n\nHere is a new input:"
    # prompt += f"\n{pp_grid(test_ios[0]['input'])}"

    # Final prompt.
    # prompt += "\n\nNow, what is the output for this new input? Let's think step-by-step."
    prompt += "\n\nANSWER:\n"
    prompt += "Remember: your job is to first generate the list of functions for Pattern 3, and then use those functions to solve the task."
    prompt += "\n[chatGPT]:"

    return prompt1, prompt


def build_prompt(task_num: int):

    # Build the intro to the prompt.
    prompt = build_prompt_base()

    # Add few-shot examples.
    prompt += build_prompt_example()

    prompt += "\n\nRemember that these 3 examples are only examples. You should follow the answer format, but you will be solving a new pattern."
    prompt += "\n\nAfter these three examples, do you understand what I want you to do? If so, answer yes and I will give you a new pattern to solve."
    # return prompt

    # Add the task examples to the prompt.
    train_ios, test_ios = get_task_ios(task_num)
    prompt = "\n\n=== Pattern 3 (Your turn) ===\n\nEXAMPLES:"
    for i, task_io in enumerate(train_ios):
        prompt += f"\n\nExample {i+1}:"
        prompt += f"\nInput:\n{pp_grid(task_io['input'])}"
        prompt += f"\nOutput:\n{pp_grid(task_io['output'])}"

    # Add the task description to the prompt.
    task_desc = get_task_best_desc(task_num)
    if task_desc is None:
        raise ValueError("No description for task " + str(task_num))
    
    prompt += f"\n\nDESCRIPTION:"
    prompt += f"\n{task_desc}"

    # # Add the task test input to the prompt.
    # prompt += "\n\nHere is a new input:"
    # prompt += f"\n{pp_grid(test_ios[0]['input'])}"

    # Final prompt.
    # prompt += "\n\nNow, what is the output for this new input? Let's think step-by-step."
    prompt += "\n\nANSWER:\n"
    prompt += "Remember: your job is to first generate the list of functions for Pattern 3, and then use those functions to solve the task."
    prompt += "\n[chatGPT]:"

    return prompt


def build_prompt_bootstrap(task_num: int):
    """Only uses outputs from tasks it previously solved as input."""

    prompt = build_prompt_base()

    prompt += "\n\I will give you 3 examples of the task you are supposed to do. If you understand the task, respond with 'Yes', and I will give you the pattern to solve."

    p_task_num = 37
    prompt += f"\n\n=== Pattern {p_task_num} ===\n\nEXAMPLES:"
    train_ios, test_ios = get_task_ios(p_task_num)
    for i, task_io in enumerate(train_ios):
        prompt += f"\n\nExample {i+1}:"
        prompt += f"\nInput:\n{pp_grid(task_io['input'])}"
        prompt += f"\nOutput:\n{pp_grid(task_io['output'])}"

    # Add the task description to the prompt.
    task_desc = get_task_best_desc(p_task_num)
    prompt += f"\n\nDESCRIPTION:"
    prompt += f"\n\n\"{task_desc}\""
    task_31 = """
1. Define a function get_column that takes two arguments - a matrix and a column index - and returns a list containing the elements in that column.
2. Define a function move_pixels_down that takes a list of values and returns a modified list where all non-zero values are moved as far down as possible. This function should return a list of the same length as the input list.
3. Define a function update_column that takes three arguments - a matrix, a column index, and a modified column list - and returns the matrix with the modified column list inserted back into the original matrix.
4. Define a function solve that takes a matrix as input and returns the modified matrix where all pixels have been moved down as far as possible. This function should make use of the previously defined functions.

def get_column(matrix, column_index):
    return [matrix[row_index][column_index] for row_index in range(len(matrix))]

def move_pixels_down(column):
    zero_count = column.count(0)
    return [0] * zero_count + [val for val in column if val != 0]

def update_column(matrix, column_index, modified_column):
    for row_index in range(len(matrix)):
        matrix[row_index][column_index] = modified_column[row_index]
    return matrix

def solve_31(matrix):
    for column_index in range(len(matrix[0])):
        column = get_column(matrix, column_index)
        modified_column = move_pixels_down(column)
        matrix = update_column(matrix, column_index, modified_column)
    return matrix"""

    prompt += '\n\n[chat-GPT]:\n' + task_31

    p_task_num = 49
    prompt += f"\n=== Pattern {p_task_num} ===\n\nEXAMPLES:"
    train_ios, test_ios = get_task_ios(p_task_num)
    for i, task_io in enumerate(train_ios):
        prompt += f"\n\nExample {i+1}:"
        prompt += f"\nInput:\n{pp_grid(task_io['input'])}"
        prompt += f"\nOutput:\n{pp_grid(task_io['output'])}"

    # Add the task description to the prompt.
    task_desc = get_task_best_desc(p_task_num)
    prompt += f"\n\nDESCRIPTION:"
    prompt += f"\n\n\"{task_desc}\""
    task_49 = """
1. Define a function find_coordinates(matrix)
2. Define a function check_same_line(coord1, coord2)
3. Define a function create_green_line(matrix, coord1, coord2)
4. Define a function connect_blue_dots(matrix)
5. Define a function solve that takes a matrix as input and returns the modified matrix where all blue dots on the same line have been connected by a green line. This function should make use of the previously defined functions.

def find_coordinates(matrix):
    coordinates = []
    for i, row in enumerate(matrix):
        for j, cell in enumerate(row):
            if cell == 8:
                coordinates.append((i, j))
    return coordinates

def check_same_line(coord1, coord2):
    return coord1[0] == coord2[0] or coord1[1] == coord2[1]

def create_green_line(matrix, coord1, coord2):
    if coord1[0] == coord2[0]:
        row = coord1[0]
        start = min(coord1[1], coord2[1])
        end = max(coord1[1], coord2[1])
        for j in range(start+1, end):
            matrix[row][j] = 3
    else:
        col = coord1[1]
        start = min(coord1[0], coord2[0])
        end = max(coord1[0], coord2[0])
        for i in range(start+1, end):
            matrix[i][col] = 3

def solve_49(matrix):
    coordinates = find_coordinates(matrix)
    for i in range(len(coordinates)):
        for j in range(i+1, len(coordinates)):
            if check_same_line(coordinates[i], coordinates[j]):
                create_green_line(matrix, coordinates[i], coordinates[j])
    return matrix    
"""

    prompt += '\n\n[chat-GPT]:\n' + task_49

    p_task_num = 5
    prompt += f"\n=== Pattern {p_task_num} ===\n\nEXAMPLES:"
    train_ios, test_ios = get_task_ios(p_task_num)
    for i, task_io in enumerate(train_ios):
        prompt += f"\n\nExample {i+1}:"
        prompt += f"\nInput:\n{pp_grid(task_io['input'])}"
        prompt += f"\nOutput:\n{pp_grid(task_io['output'])}"

    # Add the task description to the prompt.
    task_desc = get_task_best_desc(p_task_num)
    prompt += f"\n\nDESCRIPTION:"
    prompt += f"\n\n\"{task_desc}\""
    task_5 = """
1. Define a function split_input_grid(input_grid): This function takes the input grid as an argument and returns two separate 3x3 grids - the left grid and the right grid.
2. Define a function compare_grids(left_grid, right_grid): This function takes two 3x3 grids as arguments and compares them. It returns a new 3x3 grid, where a cell has a value of 2 if the corresponding cells in both input grids have a value of 1, and 0 otherwise.
3. Define a function solve_5(input_grid): This function takes the input grid, calls the split_input_grid() function to get the left and right grids, then calls the compare_grids() function to get the output grid. Finally, it returns the output grid.

def split_input_grid(input_grid):
    left_grid = [row[:3] for row in input_grid]
    right_grid = [row[4:] for row in input_grid]
    return left_grid, right_grid

def compare_grids(left_grid, right_grid):
    output_grid = []
    for row_left, row_right in zip(left_grid, right_grid):
        output_row = []
        for cell_left, cell_right in zip(row_left, row_right):
            output_row.append(2 if cell_left == cell_right == 1 else 0)
        output_grid.append(output_row)
    return output_grid

def solve_5(input_grid):
    left_grid, right_grid = split_input_grid(input_grid)
    output_grid = compare_grids(left_grid, right_grid)
    return output_grid
"""
    prompt += '\n\n[chat-GPT]:\n' + task_5

    prompt += "\n-----\nRemember that these 3 examples are only examples. You should follow the answer format, but you will be solving a new pattern."
    prompt += "\n\nAfter these three examples, do you understand what I want you to do? If so, answer yes and I will give you a new pattern to solve."
    prompt1 = prompt

    # Add the task examples to the prompt.
    train_ios, test_ios = get_task_ios(task_num)
    prompt = f"\n\n=== Pattern {task_num} (Your turn) ===\n\nEXAMPLES:"
    for i, task_io in enumerate(train_ios):
        prompt += f"\n\nExample {i+1}:"
        prompt += f"\nInput:\n{pp_grid(task_io['input'])}"
        prompt += f"\nOutput:\n{pp_grid(task_io['output'])}"

    # Add the task description to the prompt.
    task_desc = get_task_best_desc(task_num)
    if task_desc is None:
        raise ValueError("No description for task " + str(task_num))

    prompt += f"\n\nDESCRIPTION:"
    prompt += f"\n{task_desc}"

    # Final prompt.
    # prompt += "\n\nNow, what is the output for this new input? Let's think step-by-step."
    prompt += "\n\nANSWER:\n"
    prompt += f"Remember: your job is to first generate the list of functions for Pattern {task_num}, and then use those functions to solve the task using python code."
    prompt += "\n\n[chatGPT]:"

    return [prompt1, prompt]


def get_dsl_str():
    dsl_fpath = "arc-dsl/dsl.py"
    with open(dsl_fpath, "r") as f:
        dsl_str = f.read()

    dsl_fs = dsl_str.split("def")[1:]
    dsl_string = ""
    for f in dsl_fs[1:]:
        try:
            fname, comment, _ = f.split('"""')
        except:
            continue
        fname = fname.strip().replace('\n', '').replace('    ', '')
        comment = comment.strip()
        dsl_string += f"{fname} \"{comment}\"\n"

    return dsl_string


def get_task_to_dsl_sol():
    sols_fpath = "arc-dsl/solvers.py"
    with open(sols_fpath, "r") as f:
        sols_str = f.read()

    sol_fs = sols_str.split("def")[1:]
    task_name_to_sol = {}
    for f in sol_fs[1:]:

        task_name = f.split('(')[0].split('_')[-1].strip()
        solve_f = f.strip().replace('\n', '; ').replace('    ', '').replace(':;', ': ').strip()

        task_name_to_sol[task_name] = solve_f.replace(f'solve_{task_name}', 'solve')

    return task_name_to_sol

def build_dsl_prompt(task_num):

    prompt = ("You are trying to create the program for an abstract pattern that maps an input grid to an output grid. "
            "You given a description that describes the pattern. "
            "Your job is to use the description of the pattern to generate the python code that solves the task. "
            "Use the following functions to generate the python code.\n\n")
    prompt += get_dsl_str()

    prompt += "Here are examples of a description and the corresponding python code. "
    task_name_to_sol = get_task_to_dsl_sol()

    n_exs = 0
    for i in range(10):
        if i == task_num:
            continue

        task_name = get_task_name(i).split('.')[0]
        task_desc = get_task_best_desc(i)
        if task_desc is None:
            continue

        if task_name not in task_name_to_sol:
            continue

        n_exs += 1

        prompt += f"\n==\nDESCRIPTION:"
        prompt += f"\n{task_desc}"
        prompt += f"\nSOLUTION:"
        prompt += f"\n{task_name_to_sol[task_name]}"

    prompt += "\n===\nNote that 0 represents black, 1 represents dark blue, 2 represents red, 3 represents green, 4 represents yellow, 5 represents grey, 6 represents pink, 7 represents orange, 8 represents light blue / teal, and 9 represents brown / dark red."

    prompt += "\nNow what is the SOLUTION program for the following description?"
    prompt += "\nDESCRIPTION:\n"
    desc = get_task_best_desc(task_num)
    assert desc is not None
    prompt += desc
    prompt += "\nSOLUTION:"

    return prompt

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--task_num", type=int, default=0)
    args = parser.parse_args()

    # get_dsl_str()
    # get_task_to_dsl_sol()
    prompt = build_dsl_prompt(args.task_num)
    print(prompt)
    write_to_clipboard(prompt)

    # prompts = build_prompt_bootstrap(args.task_num)

    # for i, prompt in enumerate(prompts):
    #     write_to_clipboard(prompt)
    #     print(prompt)
    #     if i < len(prompts) - 1:
    #         _ = input('\nPress enter to continue...')

    # correct_answer = get_task_ios(args.task_num)[1][0]['output']

    # # Pretty print the grid.
    # for col in correct_answer:
    #     print(' '.join(str(x) for x in col))
