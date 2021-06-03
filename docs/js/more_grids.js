
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
}

function update_uneditable_div_from_grid_state(div, data_grid) {
    fill_div_with_grid(div, data_grid);
    fit_cells_to_container(div, data_grid.height, data_grid.width);
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
        const path = '../dataset/tasks_json/' + task_index + '.json';
        $.getJSON(path, function (task) {
            return resolve(task);
        }); 
    });
}

function get_task_paths() {
    return TASKS.map(x => '../dataset/tasks_json/' + x + '.json');
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
