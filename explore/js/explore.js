var DARK_MODE = false;

/**
 * switch between light and dark mode
 */
function toggle_dark_mode() {
    if (DARK_MODE) {
        document.documentElement.style.cssText += "--background-color: rgb(230, 230, 230); --upper-left-shadow: rgba(255,255,255, 0.5); \
                                                --lower-right-shadow: rgba(163,177,198,0.6); --main-font-color: #4D3252; \
                                                --highlight-color: #83aee9; --secondary-font-color: #201b20;";
        $("#dark-mode-btn").html("☾");
    } else {
        document.documentElement.style.cssText += "--background-color: rgb(50, 50, 50); --upper-left-shadow: rgba(66, 66, 66, 0.5); \
                                                --lower-right-shadow: rgba(10, 10, 10, 0.6); --main-font-color: #cd95d6; \
                                                --highlight-color: #18191b; --secondary-font-color: #f0e0f5;";
        $("#dark-mode-btn").html("☀");
    }
    DARK_MODE = !DARK_MODE;
    localStorage.setItem('dark_mode', DARK_MODE);
}

/**
 * Change the actual css for the cell class so all cells (past and future) will have style
 */
var CUR_SHAPE = 0;
function toggle_cell_shape() {
    localStorage.setItem('shape_mode', CUR_SHAPE);
    switch (CUR_SHAPE++) {
        case 0: // circle
            document.documentElement.style.cssText += "--cell-corner-radius: 50%; --cell-border-width: 0px";
            $("#cell-mode-btn").html("■");
            break;
        case 1: // no border
            document.documentElement.style.cssText += "--cell-corner-radius: 0px; --cell-border-width: 0px";
            $("#cell-mode-btn").html("□");
            break;
        case 2: // circle
        document.documentElement.style.cssText += "--cell-corner-radius: 0px; --cell-border-width: 1px";
            $("#cell-mode-btn").html("●");
        default:
            break;
    }
    CUR_SHAPE %= 3;
}

function use_user_preferences() {

    let saved_dark_mode_pref = localStorage.getItem('dark_mode');
    if (saved_dark_mode_pref == null) {
        // if user's system is dark mode
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            DARK_MODE = false;
            toggle_dark_mode();
        }
    } else {
        // set to opposite originally because toggling immediately after
        DARK_MODE = !(localStorage.getItem('dark_mode') == 'true' ? true : false);
        toggle_dark_mode();
    }

    CUR_SHAPE = parseInt(localStorage.getItem('shape_mode'));
    if (isNaN(CUR_SHAPE)) {
        CUR_SHAPE = 2;
    }
    toggle_cell_shape();
}


/**
 * focus on a single div
 */
function zoom_on_div() {
    let copy = $(this).clone();
    $("body").append(copy);
    copy.css("opacity", "0");

    copy.addClass('grid-focus');
    copy.removeClass('neumorphic');
    
    copy.animate({opacity: 1}, 100);

    let new_div = $("<div></div>");
    new_div.addClass("blurred-layer");
    new_div.appendTo($("body"));
    new_div.css('opacity', '0');
    new_div.animate({opacity: 1}, 100);

    copy.on('click', function(){
        $('.grid-focus').fadeOut(100, () => {
            $('.grid-focus').remove();
            $('.blurred-layer').remove()
        });
        $(".blurred-layer").fadeOut(100);
    });

    new_div.on('click', function(){
        $('.grid-focus').fadeOut(100, () => {
            $('.grid-focus').remove();
            $('.blurred-layer').remove()
        });
        $(".blurred-layer").fadeOut(100);
    });
}

/**
 * get the test pair for each task
 * @param {*} tasks 
 */
function load_tasks_test_pairs(tasks) {

    return new Promise((resolve, reject) => {
        const paths = get_task_paths();
        let promises = [];

        $.each(tasks, (_, task) => {
            let path = paths[task];
            let promise = new Promise((res, rej) => {
                $.getJSON(path, json => {
                    res({"task": task, "json": json.test[0]});
                });
            });
            promises.push(promise);
        });

        Promise.all(promises).then(data => {
            let data_obj = {};
            $.each(data, (_, val) => {
                const task = val.task;
                const json = val.json;
                data_obj[task] = json;
            });

            return resolve(data_obj);
        });
    });
} 

function send_to_new_task(task) {
    document.location.href = `.?task=${task}`;
}

var LOADED = false;
/**
 * load tasks into table so user can browse and choose a task
 */
function load_tasks_to_browse() {

    if (!LOADED) {
        show_loader();

        load_tasks_test_pairs(TASKS).then(pairs => {

            var num_descriptions_list = [];
            var num_interactions_list = [];
    
            // $.each(TASKS, (i, task) => {
            //     // accidentally deleted this section
            //     // TODO: Fix this
            //     // if (counts[task]) {
            //     //     num_descriptions_list.push(counts[task]['descriptions']);
            //     //     num_interactions_list.push(counts[task]['interactions']);
            //     // }
            // });
    
            task_list = [];
            for (let i=0;i<TASKS.length;i++) {
                let task_num = TASKS[i];
                let num_descs = num_descriptions_list[i];
                let num_interactions = num_interactions_list[i];
    
                // task_list.push({'number': task_num, 'descriptions': num_descs, 'interactions': num_interactions});
                task_list.push({'number': task_num});
            }
    
            $('#table').bootstrapTable({
                data: task_list,
                columns: [ { 
                    formatter : function(value,row,index) {
                        let test_pair = pairs[row.number];
                        let div = $("<div></div>");
                        fill_div_with_IO(div, array_to_grid(test_pair.input), array_to_grid(test_pair.output));
    
                        // return div as html
                        return div.wrap('<p/>').parent().html();
                    }
                }, 
                { sortable: false },
                // {
                //     field: 'operate',
                //     title: 'Select',
                //     align: 'center',
                //     valign: 'middle',
                //     clickToSelect: true,
                //     formatter : function(value,row,index) {
                //         return '<button class="btn btn-secondary load-task-btn" onclick="send_to_new_task(' + row.number + ');" task="'+row.number+'" data-dismiss="modal">Select</button> ';
                //     }
                // }
                ]
            });
    
            for (let i=0;i<TASKS.length;i++) {
                $('tr[data-index=' + i + ']').children().click(function() {
                    send_to_new_task(i);
                });
            }

            LOADED = true;
            hide_loader();

        });
    }
}

function start_walkthrough() {
    $('body').chardinJs({ attribute: 'data-intro' });
    $('body').chardinJs('start');
}

/**
 * Get all the descriptions for a task
 */
 function get_task_descriptions(task_id) {

    return new Promise(function (resolve, reject) {

        const path = '../dataset/tasks_json/' + task_id + '.json';
        $.getJSON(path, json => {
            const descs = json['descriptions'];
            var descs_list = [];

            $.each(descs, function(desc_id, desc_obj) {
                desc_obj['id'] = desc_id;
                descs_list.push(desc_obj);
            });

            return resolve(descs_list);
        });
    });
}