
// Internal state.
var CURRENT_OUTPUT_GRID = new Grid(3, 3);
var TEST_PAIR = {"input": new Grid(3, 3), "output": new Grid(3, 3)};
var COPY_PASTE_DATA = new Array();

// Cosmetic.
var MAX_CELL_SIZE = 100;

var TASK_ID;
var ATTEMPTS_SEQUENCE = [];

function update_div_from_grid_state(div, data_grid) {

    fill_div_with_grid(div, data_grid);
    fit_cells_to_container(div, data_grid.height, data_grid.width);

    // reinitialize listeners and selectables
    set_div_grid_listeners(div);
    init_selectable_grid();
}

function update_uneditable_div_from_grid_state(div, data_grid) {
    fill_div_with_grid(div, data_grid);
    fit_cells_to_container(div, data_grid.height, data_grid.width);
}

function set_div_grid_listeners(div) {
    div.find('.cell').click(function (event) {

        // get location/color
        cell = $(event.target);
        symbol = get_selected_color();

        let mode = $('input[name=tool_switching]:checked').val();
        if (mode == 'floodfill') {
            // If floodfill: fill all connected cells.
            update_grid_from_div($(`#output_grid .editable_grid`), CURRENT_OUTPUT_GRID);
            grid = CURRENT_OUTPUT_GRID.grid;
            flood_fill(grid, cell.attr('x'), cell.attr('y'), symbol);
            update_div_from_grid_state($(`#output_grid .editable_grid`), CURRENT_OUTPUT_GRID);
        } else if (mode == 'edit') {
            // Else: fill just this cell.
            set_cell_color(cell, symbol);
            update_grid_from_div($(`#output_grid .editable_grid`), CURRENT_OUTPUT_GRID);
        }

        // add to sequence of attempts
        ATTEMPTS_SEQUENCE.push({
            "action": {"tool": mode, "x": cell.attr('x'), "y": cell.attr('y'), "symbol": symbol},
            "grid": array_copy(CURRENT_OUTPUT_GRID.grid),
            "time": (new Date() - START_DATE) / 1000
        });

        // if in tutorial and in tutorial, continue tutorial
        if (PAGE == Pages.Intro && !FINISHED_TUT) {
            pre_continue();
        }
    });
}

function fill_div_with_IO(div, input_grid, output_grid) {

    div.addClass("pair_preview");

    let input_container = $('<div class="input_container"></div>');
    var input_grid_div = div.find('.input_preview');
    if (!input_grid_div.length) {
        input_grid_div = $('<div class="input_preview"></div>');
        input_grid_div.appendTo(input_container);
    }
    input_container.appendTo(div);

    var arrow = div.find('.arrow');
    if (!arrow.length) {
        arrow = $('<div class="arrow"></div>');
        var elem = document.createElement("img");
        elem.src = 'img/arrow.png';

        arrow.append(elem);
        arrow.appendTo(div);
    }

    var output_grid_div = div.find('.output_preview');
    let output_container = $('<div class="output_container"></div>');
    if (!output_grid_div.length) {
        output_grid_div = $('<div class="output_preview"></div>');
        output_grid_div.appendTo(output_container);
    }
    output_container.appendTo(div);

    fill_div_with_grid(input_grid_div, input_grid);
    fill_div_with_grid(output_grid_div, output_grid);
    fit_cells_to_container(input_grid_div, input_grid.height, input_grid.width);
    fit_cells_to_container(output_grid_div, output_grid.height, output_grid.width);
}

function fill_pair_preview(pairId, inputGrid, outputGrid) {
    var pairSlot = $('#pair_preview_' + pairId);
    if (!pairSlot.length) {
        pairSlot = $('<div id="pair_preview_' + pairId + '" class="pair_preview" index="' + pairId + '"></div>');
    }
    pairSlot.appendTo('#task_preview');
    fill_div_with_IO(pairSlot, inputGrid, outputGrid);
}

function loadJSONTask(train, test) {

    $("#task_preview").empty();

    // randomize training io grids order
    shuffle(train);

    for (var i = 0; i < train.length; i++) {
        const input_grid = array_to_grid(train[i]['input'])
        const output_grid = array_to_grid(train[i]['output'])
        fill_pair_preview(i, input_grid, output_grid);
    }

    TEST_PAIR = test[0];
    TEST_PAIR.input = array_to_grid(TEST_PAIR.input);
    TEST_PAIR.output = array_to_grid(TEST_PAIR.output);

    update_uneditable_div_from_grid_state($('#evaluation_input'), TEST_PAIR['input']);
}

function get_task(task_index) {
    return new Promise(function (resolve, reject) {
        var subset = "training";
        $.getJSON("https://api.github.com/repos/samacqua/ARC-Turks/contents/data/" + subset, function (tasks) {
            var task = tasks[task_index];
            $.getJSON(task["download_url"], function (json) {
                return resolve(json);
            });
        }); 
    });
}

function get_task_paths() {
    return new Promise(function (resolve, reject) {
        var subset = "training";
        $.getJSON("https://api.github.com/repos/samacqua/ARC-Turks/contents/data/" + subset, function (tasks) {
            return resolve(tasks.map(x => x.path));
        }); 
    });
}

function loadTask(task_index) {
    return new Promise(function (resolve, reject) {
        console.log("Loading task:", task_index);
        if (task_index == null) {
            console.warn("Tried to load a null task. Ensure that you are providing a task number.");
        }
        get_task(task_index).then(json => {
            try {
                train = json['train'];
                test = json['test'];
            } catch (e) {
                errorMsg('Bad file format');
                return;
            }
            loadJSONTask(train, test);
            TASK_ID = task_index;
            console.log("Loaded task:", task_index);
            return resolve();
        });
    });
}

function init_selectable_grid() {
    try {
        $('.selectable_grid').selectable('destroy');
    }
    catch (e) { }
    toolMode = $('input[name=tool_switching]:checked').val();
    if (toolMode == 'select') {
        $('.selectable_grid').selectable(
            {
                autoRefresh: false,
                filter: '> .grid_row > .cell',
                start: function (event, ui) {
                    $('.ui-selected').each(function (i, e) {
                        $(e).removeClass('ui-selected');
                    });
                }
            }
        );
    }
}

function change_color(selected_color) {
    $('#symbol_picker').find('.symbol_preview').each(function (i, color) {
        $(color).removeClass('selected-symbol-preview');
    })
    selected_color.addClass('selected-symbol-preview');
}

// Initial event binding.
$(document).ready(function () {

    // select color action
    $('#symbol_picker').find('.symbol_preview').click(function (event) {
        selected_color = $(event.target);
        change_color(selected_color);
    });

    // floodfill/edit
    $('.editable_grid').each(function (i, grid_div) {
        set_div_grid_listeners($(grid_div));
    });

    // copy-paste message
    $('input[type=radio][name=tool_switching]').change(function () {
        init_selectable_grid(true);
        toolMode = $('input[name=tool_switching]:checked').val();
        if (toolMode == 'select') {
            infoMsg('Drag over an area to select, and press "C" to copy');
        }
    });

    // Copy and paste listeners
    $('body').keydown(function (event) {
        let mode = $('input[name=tool_switching]:checked').val();

        if (mode != 'select') {
            return;
        }

        if (event.which == 67) {
            // Press C

            let selected = $('.ui-selected');

            if (selected.length == 0) {
                return;
            }

            COPY_PASTE_DATA = [];
            for (var i = 0; i < selected.length; i++) {
                let x = parseInt($(selected[i]).attr('x'));
                let y = parseInt($(selected[i]).attr('y'));
                let symbol = parseInt($(selected[i]).attr('symbol'));
                COPY_PASTE_DATA.push([x, y, symbol]);
            }
            infoMsg('Successfully copied! Select where you want to paste your copied cells and press "V" to paste.');

            // add to sequence of attempts
            ATTEMPTS_SEQUENCE.push({
                "action": {"tool": "copy", "copy_paste_data": COPY_PASTE_DATA.slice()},
                "grid": array_copy(CURRENT_OUTPUT_GRID.grid),
                "time": (new Date() - START_DATE) / 1000
            });

        } else if (event.which == 86) {
            // Press V
            if (COPY_PASTE_DATA.length == 0) {
                errorMsg('You must first copy (by selecting an area and pressing "C") to paste.');
                return;
            }
            let selected = $('.editable_grid').find('.ui-selected');
            if (selected.length == 0) {
                errorMsg('Select a target cell on the output grid.');
                return;
            }

            let row = $(selected.parent());
            let grid_div = $(row.parent()[0]); // get first of all possible editable grids (should only be 1)

            let targetx = parseInt(selected.attr('x'));
            let targety = parseInt(selected.attr('y'));

            let xs = new Array();
            let ys = new Array();
            let symbols = new Array();

            for (var i = 0; i < COPY_PASTE_DATA.length; i++) {
                xs.push(COPY_PASTE_DATA[i][0]);
                ys.push(COPY_PASTE_DATA[i][1]);
                symbols.push(COPY_PASTE_DATA[i][2]);
            }

            // if selected area, paste from top-left
            let minx = Math.min(...xs);
            let miny = Math.min(...ys);
            for (var i = 0; i < xs.length; i++) {
                x = xs[i];
                y = ys[i];
                symbol = symbols[i];
                newx = x - minx + targetx;
                newy = y - miny + targety;
                res = grid_div.find('[x="' + newx + '"][y="' + newy + '"] ');
                if (res.length == 1) {
                    cell = $(res[0]);
                    set_cell_color(cell, symbol);
                }
            }

            update_grid_from_div($(`#output_grid .editable_grid`), CURRENT_OUTPUT_GRID);

            ATTEMPTS_SEQUENCE.push({
                "action": {"tool": "paste", "copy_paste_data": COPY_PASTE_DATA.slice(), "x": targetx, "y": targety},
                "grid": array_copy(CURRENT_OUTPUT_GRID.grid),
                "time": (new Date() - START_DATE) / 1000
            });
        }
    });
});
