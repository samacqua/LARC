from build_prompt import get_task_ios, pp_grid
from copy import deepcopy


def check_answer(solve_func, task_num: int):
    train_ios, test_ios = get_task_ios(task_num)

    for train_io in train_ios:
        in_grid, out_grid = train_io['input'], train_io['output']
        pred = solve_func(deepcopy(in_grid))
        if pred != out_grid:
            print('Input:')
            print(pp_grid(train_io['input']))
            print('Output:')
            print(pp_grid(train_io['output']))
            print('Your Output:')
            print(pp_grid(solve_func(train_io['input'])))
            print()

    for test_io in test_ios:
        in_grid, out_grid = test_io['input'], test_io['output']
        pred = solve_func(deepcopy(in_grid))
        if pred != out_grid:
            print('Input:')
            print(pp_grid(test_io['input']))
            print('Output:')
            print(pp_grid(test_io['output']))
            print('Your Output:')
            print(pp_grid(solve_func(test_io['input'])))
            print()


# TASK 1

def find_enclosed_area(grid):
    rows = len(grid)
    columns = len(grid[0])

    def is_valid(x, y):
        return 0 <= x < rows and 0 <= y < columns

    def dfs(x, y):
        if not is_valid(x, y) or grid[x][y] != 0:
            return
        grid[x][y] = -1
        directions = [(1, 0), (-1, 0), (0, 1), (0, -1)]
        for dx, dy in directions:
            dfs(x + dx, y + dy)

    # Find the bordering empty area and mark it as -1
    for i in range(rows):
        for j in range(columns):
            if (i == 0 or i == rows - 1 or j == 0 or j == columns - 1) and grid[i][j] == 0:
                dfs(i, j)

    # Fill the enclosed empty area with 4
    for i in range(rows):
        for j in range(columns):
            if grid[i][j] == 0:
                grid[i][j] = 4

    # Restore the bordering empty area
    for i in range(rows):
        for j in range(columns):
            if grid[i][j] == -1:
                grid[i][j] = 0

    return grid

def solve_1(grid):
    return find_enclosed_area(grid)


# TASK 2

def duplicate_pattern(pattern):
    return pattern.copy()

def change_color(pattern, old_color, new_color):
    return [[new_color if element == old_color else element for element in row] for row in pattern]

def append_pattern(original_pattern, new_pattern):
    return original_pattern + new_pattern

def solve_2(original_pattern):
    duplicated_pattern = duplicate_pattern(original_pattern)
    new_pattern = change_color(duplicated_pattern, 1, 2)
    output_pattern = append_pattern(original_pattern, new_pattern)
    return output_pattern

# TASK 5

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

# TASK 7

def find_coordinates_7(grid, value):
    coordinates = []
    for i, row in enumerate(grid):
        for j, cell in enumerate(row):
            if cell == value:
                coordinates.append((i, j))
    return coordinates

def direction_vector(shape_coords, cube_coords):
    shape_center = (sum(coord[0] for coord in shape_coords) / len(shape_coords), 
                    sum(coord[1] for coord in shape_coords) / len(shape_coords))
    cube_center = (sum(coord[0] for coord in cube_coords) / len(cube_coords), 
                   sum(coord[1] for coord in cube_coords) / len(cube_coords))
    return (cube_center[0] - shape_center[0], cube_center[1] - shape_center[1])

def move_shape_towards_cube(grid, shape_coords, cube_coords, vector):
    new_grid = [[0 for _ in range(len(grid[0]))] for _ in range(len(grid))]
    for coord in cube_coords:
        new_grid[coord[0]][coord[1]] = 8
    for coord in shape_coords:
        new_i, new_j = coord[0] + round(vector[0]), coord[1] + round(vector[1])
        import pdb; pdb.set_trace()
        while new_grid[new_i][new_j] == 0:
            new_i += round(vector[0])
            new_j += round(vector[1])
        new_i -= round(vector[0])
        new_j -= round(vector[1])
        new_grid[new_i][new_j] = 2
    return new_grid

def solve_7(input_grid):
    shape_coords = find_coordinates_7(input_grid, 2)
    cube_coords = find_coordinates_7(input_grid, 8)
    vector = direction_vector(shape_coords, cube_coords)
    output_grid = move_shape_towards_cube(input_grid, shape_coords, cube_coords, vector)
    return output_grid

# TASK 31

"""
1. Define a function get_column that takes two arguments - a matrix and a column index - and returns a list containing the elements in that column.
2. Define a function move_pixels_down that takes a list of values and returns a modified list where all non-zero values are moved as far down as possible. This function should return a list of the same length as the input list.
3. Define a function update_column that takes three arguments - a matrix, a column index, and a modified column list - and returns the matrix with the modified column list inserted back into the original matrix.
4. Define a function solve that takes a matrix as input and returns the modified matrix where all pixels have been moved down as far as possible. This function should make use of the previously defined functions.
"""

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
    return matrix


# TASK 38

def find_colored_shape(matrix):
    colored_shape_coordinates = []
    for i, row in enumerate(matrix):
        for j, value in enumerate(row):
            if value != 0:
                colored_shape_coordinates.append((i, j))
    return colored_shape_coordinates

def find_upper_left_corner(colored_shape_coordinates):
    upper_left_corner = min(colored_shape_coordinates, key=lambda x: (x[0], x[1]))
    return upper_left_corner

def extract_output(matrix, upper_left_corner, output_size):
    output = []
    for i in range(output_size[0]):
        row = []
        for j in range(output_size[1]):
            row.append(matrix[upper_left_corner[0] + i][upper_left_corner[1] + j])
        output.append(row)
    return output

def solve_38(matrix):
    colored_shape_coordinates = find_colored_shape(matrix)
    upper_left_corner = find_upper_left_corner(colored_shape_coordinates)
    output_size = (3, 3)
    return extract_output(matrix, upper_left_corner, output_size)


# TASK 48

def find_smallest_object(matrix):
    from collections import defaultdict
    import sys

    color_areas = defaultdict(int)

    for row in matrix:
        for cell in row:
            if cell != 0:
                color_areas[cell] += 1

    smallest_color = min(color_areas, key=color_areas.get)
    for i, row in enumerate(matrix):
        for j, cell in enumerate(row):
            if cell == smallest_color:
                start_row = i
                start_col = j
                break

    end_row = start_row
    end_col = start_col

    while end_row < len(matrix) and matrix[end_row][start_col] == smallest_color:
        end_row += 1
    while end_col < len(matrix[0]) and matrix[start_row][end_col] == smallest_color:
        end_col += 1

    return start_row, start_col, end_row - start_row, end_col - start_col


def create_new_matrix(object_info, old_matrix):
    start_row, start_col, rows, cols = object_info
    new_matrix = [[0] * cols for _ in range(rows)]

    for i in range(rows):
        for j in range(cols):
            new_matrix[i][j] = old_matrix[start_row][start_col]

    return new_matrix


def solve_48(matrix):
    # Find the smallest object and create a new matrix with it
    object_info = find_smallest_object(matrix)
    new_matrix = create_new_matrix(object_info, matrix)
    return new_matrix

# TASK 49

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

# TASK 57

def get_dimensions(grid):
    rows = len(grid)
    cols = len(grid[0]) if rows > 0 else 0
    return rows, cols

def create_empty_grid(rows, cols):
    return [[0 for _ in range(cols)] for _ in range(rows)]

def fill_spiral(grid, rows, cols):
    green = 3
    x, y = 0, 0
    while x < rows and y < cols:
        for i in range(y, cols):
            grid[x][i] = green
        x += 1

        for i in range(x, rows):
            grid[i][cols-1] = green
        cols -= 1

        if x < rows:
            for i in range(cols-1, y-1, -1):
                grid[rows-1][i] = green
            rows -= 1

        if y < cols:
            for i in range(rows-1, x-1, -1):
                grid[i][y] = green
            y += 1
    return grid

def solve_57(input_grid):
    rows, cols = get_dimensions(input_grid)
    output_grid = create_empty_grid(rows, cols)
    output_grid = fill_spiral(output_grid, rows, cols)
    return output_grid

# TASK 152

def identify_shapes(matrix):
    shapes = {}
    for i in range(len(matrix)):
        for j in range(len(matrix[i])):
            if matrix[i][j] != 0:
                if matrix[i][j] not in shapes:
                    shapes[matrix[i][j]] = []
                shapes[matrix[i][j]].append((i, j))
    return shapes

def create_shape_matrix(shape_coords):
    min_row = min([coord[0] for coord in shape_coords])
    max_row = max([coord[0] for coord in shape_coords])
    min_col = min([coord[1] for coord in shape_coords])
    max_col = max([coord[1] for coord in shape_coords])

    shape_matrix = [[0] * (max_col - min_col + 1) for _ in range(max_row - min_row + 1)]
    for coord in shape_coords:
        shape_matrix[coord[0] - min_row][coord[1] - min_col] = 1
    return shape_matrix

def join_shapes(shape1_matrix, shape2_matrix):
    joined_matrix = []
    for row in shape1_matrix:
        joined_matrix.append(row + [0] * len(shape2_matrix[0]))
    for row in shape2_matrix:
        joined_matrix.append([0] * len(shape1_matrix[0]) + row)
    return joined_matrix

def print_output(matrix):
    for row in matrix:
        print(' '.join(str(x) for x in row))


def solve_152(input_matrix):
    shapes = identify_shapes(input_matrix)
    shape_matrices = [create_shape_matrix(coords) for coords in shapes.values()]
    joined_matrix = join_shapes(shape_matrices[0], shape_matrices[1])
    return joined_matrix

# TASK 347

def find_center_line(input_matrix):
    for row_idx, row in enumerate(input_matrix):
        if any(cell != 0 for cell in row):
            return row_idx

def alternate_colors(matrix, center_line):
    orange, light_blue = 7, 8
    color = light_blue

    for row_idx in range(center_line, -1, -1):
        for col_idx, cell in enumerate(matrix[row_idx]):
            if cell != 0:
                matrix[row_idx][col_idx] = color
                matrix[-(row_idx + 1)][col_idx] = color

        color = orange if color == light_blue else light_blue

def print_matrix(matrix):
    for row in matrix:
        print(" ".join(str(cell) for cell in row))

def solve_347(input_matrix):
    center_line = find_center_line(input_matrix)
    alternate_colors(input_matrix, center_line)
    return input_matrix

# TASK 358

def unique_bar_colors(matrix):
    colors = set()
    for row in matrix:
        colors.update(row)
    return colors

def bar_boundaries(matrix, colors):
    boundaries = {}
    for color in colors:
        top, bottom, left, right = len(matrix), 0, len(matrix[0]), 0
        for i, row in enumerate(matrix):
            for j, cell in enumerate(row):
                if cell == color:
                    top = min(top, i)
                    bottom = max(bottom, i)
                    left = min(left, j)
                    right = max(right, j)
        boundaries[color] = (top, bottom, left, right)
    return boundaries

def replace_random_colors(matrix, boundaries):
    output = [row.copy() for row in matrix]
    for color, (top, bottom, left, right) in boundaries.items():
        for i in range(top, bottom + 1):
            for j in range(left, right + 1):
                output[i][j] = color
    return output

def solve_358(matrix):
    colors = unique_bar_colors(matrix)
    boundaries = bar_boundaries(matrix, colors)
    output = replace_random_colors(matrix, boundaries)
    return output

if __name__ == '__main__':

    # Correct.
    check_answer(solve_1, 1)
    check_answer(solve_5, 5)
    check_answer(solve_31, 31)
    check_answer(solve_49, 49)

    # Incorrect.
    # check_answer(solve_2, 2)
    # check_answer(solve_7, 7)
    # check_answer(solve_38, 38)
    # check_answer(solve_48, 48)
    # check_answer(solve_57, 57)
    # check_answer(solve_152, 152)
    # check_answer(solve_347, 347)
    # check_answer(solve_358, 358)
