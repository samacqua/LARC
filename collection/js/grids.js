class Grid {
    constructor(height, width, values) {
        this.height = height;
        this.width = width;
        this.grid = new Array(height);
        for (var i = 0; i < height; i++) {
            this.grid[i] = new Array(width);
            for (var j = 0; j < width; j++) {
                if (values != undefined && values[i] != undefined && values[i][j] != undefined) {
                    this.grid[i][j] = values[i][j];
                } else {
                    this.grid[i][j] = 0;
                }
            }
        }
    }
}

/**
 * Convert a 2-d array to a Grid object
 * @param {Array} arr the array of the grid state
 */
function array_to_grid(arr) {
    height = arr.length;
    width = arr[0].length;
    return new Grid(height, width, arr);
}

// size cells dynamically, but keep their square shape
// strange css hack to make sure each resizes but still equal dimensions
function fit_cells_to_container(container, height, width) {

    if (height > 1.5*width) {
        container.find('.cell').css('height', '0px');
        container.find('.cell').css('padding-top', `${1/height*100}%`);
        container.find('.cell').css('width', 1/height*100 + '%');   
    } else {
        container.find('.cell').css('height', '0px');
        container.find('.cell').css('padding-top', `${1/width*100}%`);
        container.find('.cell').css('width', 1/width*100 + '%');
    }
}

/**
 * Fill a div with correct symbols for a data grid
 * @param {object} div the jQuery div element to fill
 * @param {object} dataGrid the Grid object to fill the div with
 */
function fill_div_with_grid(div, dataGrid) {
    div.empty();
    height = dataGrid.height;
    width = dataGrid.width;

    for (var i = 0; i < height; i++) {
        var row = $(document.createElement('div'));
        row.addClass('grid_row');
        for (var j = 0; j < width; j++) {
            var cell = $(document.createElement('div'));
            cell.addClass('cell');
            cell.attr('x', i);
            cell.attr('y', j);
            set_cell_color(cell, dataGrid.grid[i][j]);
            row.append(cell);
        }
        div.append(row);
    }
}

/**
 * Sync a data grid with the div's state
 * @param {object} div the jQuery div element to get the state of
 * @param {object} dataGrid the Grid object to update
 */
function update_grid_from_div(div, dataGrid) {
    row_count = div.find('.grid_row').length
    if (dataGrid.height != row_count) {
        return
    }
    col_count = div.find('.cell').length / row_count
    if (dataGrid.width != col_count) {
        return
    }
    div.find('.grid_row').each(function (i, row) {
        $(row).find('.cell').each(function (j, cell) {
            dataGrid.grid[i][j] = parseInt($(cell).attr('symbol'));
        });
    });
}

function set_cell_color(cell, symbol) {
    cell.attr('symbol', symbol);
    classesToRemove = ''
    for (i = 0; i < 10; i++) {
        classesToRemove += 'symbol_' + i + ' ';
    }
    cell.removeClass(classesToRemove);
    cell.addClass('symbol_' + symbol);
}

function flood_fill(grid, i, j, symbol) {
    i = parseInt(i);
    j = parseInt(j);
    symbol = parseInt(symbol);

    target = grid[i][j];

    if (target == symbol) {
        return;
    }

    function flow(i, j, symbol, target) {
        if (i >= 0 && i < grid.length && j >= 0 && j < grid[i].length) {
            if (grid[i][j] == target) {
                grid[i][j] = symbol;
                flow(i - 1, j, symbol, target);
                flow(i + 1, j, symbol, target);
                flow(i, j - 1, symbol, target);
                flow(i, j + 1, symbol, target);
            }
        }
    }
    flow(i, j, symbol, target);
}

function get_selected_color() {
    selected = $('#symbol_picker .selected-symbol-preview')[0];
    return $(selected).attr('symbol');
}

function parseSizeTuple(size) {
    size = size.split('x');
    if (size.length != 2) {
        alert('Grid size should have the format "3x3", "5x7", etc.');
        return;
    }
    if ((size[0] < 1) || (size[1] < 1)) {
        alert('Grid size should be at least 1. Cannot have a grid with no cells.');
        return;
    }
    if ((size[0] > 30) || (size[1] > 30)) {
        alert('Grid size should be at most 30 per side. Pick a smaller size.');
        return;
    }
    return size;
}


function resizeOutputGrid(replay=false) {
    size = $('#output_grid_size').val();
    size = parseSizeTuple(size);
    height = parseInt(size[1]);
    width = parseInt(size[0]);

    jqGrid = $('#output_grid .editable_grid');
    update_grid_from_div($(`#output_grid .editable_grid`), CURRENT_OUTPUT_GRID);
    dataGrid = JSON.parse(JSON.stringify(CURRENT_OUTPUT_GRID.grid));
    CURRENT_OUTPUT_GRID = new Grid(height, width, dataGrid);
    update_div_from_grid_state(jqGrid, CURRENT_OUTPUT_GRID);

    if (!replay) {
        ATTEMPTS_SEQUENCE.push({
            "action": {"tool": "resizeOutputGrid", "width": width, "height": height},
            "grid": array_copy(CURRENT_OUTPUT_GRID.grid),
            "time": (new Date() - START_DATE) / 1000
        });
    }
}

function resetOutputGrid(replay=false) {
    CURRENT_OUTPUT_GRID = new Grid(3, 3);
    jqGrid = $('#output_grid .editable_grid');
    update_div_from_grid_state(jqGrid, CURRENT_OUTPUT_GRID);

    resizeOutputGrid(replay=true);

    if (!replay) {
        ATTEMPTS_SEQUENCE.push({
            "action": {"tool": "resetOutputGrid"},
            "grid": array_copy(CURRENT_OUTPUT_GRID.grid),
            "time": (new Date() - START_DATE) / 1000
        });
    }
}

function copyFromInput(replay=false, output_grid_id="output_grid") {
    update_grid_from_div($(`#${output_grid_id} .editable_grid`), CURRENT_OUTPUT_GRID);
    CURRENT_OUTPUT_GRID = array_to_grid(TEST_PAIR.input.grid);
    update_div_from_grid_state($(`#output_grid .editable_grid`), CURRENT_OUTPUT_GRID);
    $('#output_grid_size').val(CURRENT_OUTPUT_GRID.width + 'x' + CURRENT_OUTPUT_GRID.height);

    if (!replay) {
        ATTEMPTS_SEQUENCE.push({
            "action": {"tool": "copyFromInput"},
            "grid": array_copy(CURRENT_OUTPUT_GRID.grid),
            "time": (new Date() - START_DATE) / 1000
        });
    }
}