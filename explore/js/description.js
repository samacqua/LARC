var CUR_DESC;
var PASSIVE_SUPPORTED = false;

$(window).on('load', function () {
    const { task, desc_id } = parseUrl(window.location.search);

    // check if passive events are supported (for performance) https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md
    try {
        const options = {
            get passive() { // This function will be called when the browser
                            //   attempts to access the passive property.
                PASSIVE_SUPPORTED = true;
                return false;
            }
        };

        window.addEventListener("test", null, options);
        window.removeEventListener("test", null, options);
    } catch(err) {
        PASSIVE_SUPPORTED = false;
    }

    load_new_desc(task, desc_id);
    use_user_preferences();

    // show layout if first time visiting
    if (localStorage.getItem('visited_description') != 'true') {
        setTimeout(() => {
            start_walkthrough();
        }, 1000);
        localStorage.setItem('visited_description', 'true');
    }
});

/**
 * Handle back and forth navigation
 * from https://stackoverflow.com/a/3354511/5416200 (but url stored in query params)
 * @param {Object} e the event that carries the 
 */
window.onpopstate = function(e){
    if(e.state){
        load_new_task(e.state.task);
        document.title = e.state.pageTitle;
    }
};

/**
 * Parses the url to get the task number
 * @param {string} url 
 */
function parseUrl(url) {
    const urlParams = new URLSearchParams(url);
    let task = urlParams.get('task');
    if (!task) {
        task = TASKS[Math.floor(Math.random()*TASKS.length)];
        document.location.href = `.?task=${task}`;
    }

    let desc_id = urlParams.get('id');
    if (!desc_id) {
        document.location.href = `.?task=${task}`;
    }
    return {"task": task, "desc_id": desc_id };
}

/**
 * update the url so that the url can be shared to show same information
 * https://stackoverflow.com/a/41542008/5416200
 * @param {Object} response the data that updates the url {task: *task*}
 */
function updateUrl(response) {
    if ('URLSearchParams' in window) {
        var searchParams = new URLSearchParams(window.location.search);
        searchParams.set("task", response.task);
        searchParams.set("id", response.desc_id);
        var newRelativePathQuery = window.location.pathname + '?' + searchParams.toString();
        load_new_desc(response.task, response.desc_id);
        document.title = "LARC: " + response.task.toString();
        window.history.pushState({"task": response.task, "desc_id": response.desc_id, "pageTitle": document.title}, "", newRelativePathQuery);
    }
}

// for pausing and playing action sequences
var ACTION_SEQUENCE_INTERVALS = [];
var ACTION_SEQUENCE_INTERVAL_FUNCTIONS = [];

var GRAPH;
var GRAPH_SETTINGS = {
    scalingRatio: 1e5,
    strongGravityMode: true,
    gravity: 0.2,
    slowDown: 50,
    startingIterations: 0,
};
var BUILDS = [];

/**
 * load a new task after user selects it
 * @param {number} task the task to load
 * @param {string} desc_id the id of the description to load
 */
function load_new_desc(task, desc_id) {

    stop_action_sequences();

    loadTask(task).then(() => {

        $(".test-io").empty();
        fill_div_with_IO($("#test-io-preview"), TEST_PAIR.input, TEST_PAIR.output);
        $("#test-io-preview").addClass('neumorphic');

        $(".neumorphic").on('click', zoom_on_div);

        $("#task-title").html(`Task ${task}`);
        get_task_descriptions(task, DESCRIPTIONS_TYPE).then(function (descriptions) {
    
            $("#verification-attempts").empty();
            $("#description-builds").empty();
    
            descriptions.sort(sort_descs_bandit_score());
            PAST_DESCS = descriptions;        
            createDescsPager(task, descriptions, desc_id);
    
            let cur_desc = find_obj(descriptions, "id", desc_id);
            CUR_DESC = cur_desc;
    
            $("#ex_size_desc").text(cur_desc['grid_description']);
            $("#ex_see_desc").text(cur_desc['see_description']);
            $("#ex_do_desc").text(cur_desc['do_description']);
    
            show_attempts(cur_desc.attempt_jsons, $("#verification-attempts"));

            let last_attempt = cur_desc.attempt_jsons[cur_desc.attempt_jsons.length-1];
            update_div_from_grid_state($("#verification-grid .editable_grid"), array_to_grid(last_attempt));

            ACTION_SEQUENCE_INTERVAL_FUNCTIONS = [];

            if (cur_desc.action_sequence != null) {
                let sequence_interval = repeat_action_sequence_in_div(cur_desc.action_sequence, $("#verification-grid"));
                ACTION_SEQUENCE_INTERVALS.push(sequence_interval);
                ACTION_SEQUENCE_INTERVAL_FUNCTIONS.push(function() {return repeat_action_sequence_in_div(cur_desc.action_sequence, $("#verification-grid"))});
            } else {
                console.error("Description collected before action sequences.");
                $("#verification-grid .action-type-badge:first").text("No action sequence");
            }

            PAUSED = true;
            toggle_action_sequences();
    

            const desc = find_obj(descriptions, 'id', desc_id);

            const builds = load_desc_builds(desc);
            $("#builds-header").text("Builds (" + builds.length.toString() + ")");
            builds.sort((a, b) => { return (a < b ? -1 : 1) });
            BUILDS = builds;
            $.each(builds, (i, build) => {
                $(`<h4>Builder ${i+1} <button class="neumorphic-btn play-btns" onclick="show_build_info(${i});">ⓘ</button> </br></h4>`).appendTo($("#description-builds"));
                create_build_row(build);
            });

            let g = create_action_sequence_graph_from_builds(cur_desc, builds);

            $('#graph-container').empty();

            GRAPH = new sigma({
                graph: g,
                container: 'graph-container',
                // https://github.com/jacomyal/sigma.js/wiki/Settings
                settings: {
                    enableCamera: true,
                    enableHovering: true,
                    labelHoverShadowColor: "clear",
                    nodeHoverPrecision: 10,
                    drawLabels: true,
                    labelThreshold: 1000, // so doesn't draw labels, turning off drawLabels turns off hover events
                    minNodeSize: 5,
                    maxNodeSize: 13,
                    minEdgeSize: 1.5,
                    maxEdgeSize: 5,
                    edgesPowRatio: 0.5,
                    borderSize: 1,
                }
            });

            update_uneditable_div_from_grid_state($("#action-sequence-cur-grid .grid_inner_container"), new Grid(3, 3));
            GRAPH.bind('overNode outNode clickNode doubleClickNode rightClickNode', function(e) {
                let node_grid = JSON.parse(e.data.node.id);
                node_grid = array_to_grid(node_grid);
                update_uneditable_div_from_grid_state($("#action-sequence-cur-grid .grid_inner_container"), node_grid);
            });
            
            const force_settings = {
                scalingRatio: 1e5,
                strongGravityMode: true,
                gravity: 0.2,
                slowDown: 1,
                startingIterations: 200,
                };
            GRAPH.startForceAtlas2(force_settings);
            setTimeout(function() { GRAPH.stopForceAtlas2(); }, 1000);
    
        }).catch(error => {
            errorMsg("Failed to load past task descriptions. Please ensure your internet connection, and retry. If the issue persists, please email samacqua@mit.edu");
            console.error(error);
        });
    });
}

function create_build_row(build) {
    let row = $("<div class='row' style='justify-content: left'></div>");
    row.appendTo($("#description-builds"));

    const attempts_col = $("<div class='col-md-9'></div>");
    const attempts_row = $("<div class='row into-page' style='justify-content: left; height: 100%'></div>");
    attempts_row.appendTo(attempts_col);
    attempts_col.appendTo(row);
    show_attempts(build.attempt_jsons, attempts_row);

    const action_sequence_col = $("<div class='col-md-3'></div>");
    const action_sequence_row = $("<div class='row into-page' style='justify-content: left; height: 100%'></div>");
    const action_sequence_container = $("<div class='single_grid'></div>");
    const grid_cont = $('<div class="editable_grid selectable_grid">');
    const action_sequence_label = $('<h5 class="action-type-badge">action sequence</h5>')
    grid_cont.appendTo(action_sequence_container);
    action_sequence_label.appendTo(action_sequence_container);
    action_sequence_container.appendTo(action_sequence_row);
    action_sequence_row.appendTo(action_sequence_col);
    action_sequence_col.appendTo(row);

    let last_attempt = array_to_grid(build.attempt_jsons[build.attempt_jsons.length-1]);
    update_uneditable_div_from_grid_state(grid_cont, last_attempt);

    if (build.action_sequence) {
        const sequence_interval = repeat_action_sequence_in_div(build.action_sequence, action_sequence_container);
        ACTION_SEQUENCE_INTERVALS.push(sequence_interval);
        ACTION_SEQUENCE_INTERVAL_FUNCTIONS.push(function() {return repeat_action_sequence_in_div(build.action_sequence, action_sequence_container)});
    } else {
        console.log("NO ACTION SEQUENCE");
        action_sequence_container.find(".action-type-badge:first").text("No action sequence");
    }

    $("</br>").appendTo($("#description-builds"));
}

function load_desc_builds(desc) {
    const builds = desc['builds'];
    var build_list = [];

    $.each(builds, function(build_id, build_obj) {
        build_obj['id'] = build_id;
        build_list.push(build_obj);
    });

    return build_list;
}

var PAUSED = false;

function toggle_action_sequences() {

    if (PAUSED) {
        $("#play-btn").html("‖");
        play_action_sequences();
    } else {
        $("#play-btn").html("►");
        stop_action_sequences();
    }
    PAUSED = !PAUSED;
}

function stop_action_sequences() {
    $.each(ACTION_SEQUENCE_INTERVALS, (i, interval) => {
        clearInterval(interval);
    });
    ACTION_SEQUENCE_INTERVALS = [];
}

function play_action_sequences() {
    $.each(ACTION_SEQUENCE_INTERVAL_FUNCTIONS, (i, fnctn) => {
        ACTION_SEQUENCE_INTERVALS.push(fnctn());
    });
}

function show_attempts(attempts_json, container) {

    $.each(attempts_json, (i, attempt) => {

        let grid = array_to_grid(attempt);
        let grid_div = $(`<div class="col-sm-4 ver-attempts"></div>`);
        grid_div.appendTo(container);
        fill_div_with_grid(grid_div, grid);
        fit_cells_to_container(grid_div, grid.height, grid.width);
        // grid_div.addClass('neumorphic');


        let badge_type = 'fail-lbl';
        if ( arraysEqual(attempt, TEST_PAIR.output.grid) ) {
            badge_type = 'suc-lbl';
        }
        let label = $(`<h4 class="action-type-badge ${badge_type}" >attempt ${i+1}</h4>`);
        label.appendTo(grid_div);
    });
}

/**
 * Create an href on the left for each task description
 * @param {[Objects]} descriptions an array of all description objects
 */
function createDescsPager(task, descriptions, desc_id) {

    // all descriptions
    $("#descriptions-pager").empty();
    $.each(descriptions, (i, desc) => {
        let row = $(`<a class="list-group-item list-group-item-action neumorphic-list-item" data-toggle="list" role="tab" 
            href="description.html?task=${task}&id=${desc.id}">Description ${i+1}</a>`);    // <span class="desc_item_id">${desc.id}</span>
        if (desc.id == desc_id) {
            row.addClass("active");
        }
        $("#descriptions-pager").append(row);
    });

    $('#descriptions-pager a').click(function() {

        function getParam(url, name, defaultValue) {
            // https://stackoverflow.com/a/48933102/5416200
            var a = document.createElement('a');
            a.href = '?' + unescape(String(name));
            var un = a.search.slice(1);
            var esc = un.replace(/[.?*+^$[\]\\(){}|-]/g, '\\$&');
            var re = new RegExp('^\\?&*(?:[^=]*=[^&]*&+)*?(' + esc + ')=([^&]*)');
            a.href = url;
            var query = a.search;
            return re.test(query) ? query.match(re).slice(1).map(decodeURIComponent) : [un, defaultValue];
        }

        let url = $(this).attr('href');
        let task = getParam(url, "task", TASK_ID)[1];
        let desc = getParam(url, "id", desc_id)[1];
        
        let resp = {"task": task, "desc_id": desc};
        updateUrl(resp);
    });

    // task overview
    $("#task-overview").attr("href", `.?task=${task}`);
    $('#overview-group a').click(function(){
        document.location.href = $(this).attr('href');
    });
}

function repeat_action_sequence_in_div(sequence, container_div) {

    function play_action_sequence_item(action_sequence, container, i=0) {

        let tool_display = container.find('.action-type-badge:first');

        tool_display.removeClass('suc-lbl');
        tool_display.removeClass('fail-lbl');

        let tool = action_sequence[i].action.tool;
        if (tool == "check") {
            tool = action_sequence[i].action.correct ? "check: correct" : "check: incorrect";
            let new_class = action_sequence[i].action.correct ? "suc-lbl" : "fail-lbl";
            tool_display.addClass(new_class);
        } else if (tool == "copyFromInput") {
            tool = "copy input";
        } else if (tool == "resizeOutputGrid") {
            tool = "resize";
        }

        tool_display.text(tool);

        let grid = array_to_grid(action_sequence[i].grid);
        let grid_div = container.find('.editable_grid');
        update_div_from_grid_state(grid_div, grid);
    }

    let i = 0;
    let interval_length = 5000 / sequence.length;

    return setInterval(() => {
        play_action_sequence_item(sequence, container_div, i++%sequence.length);
    }, interval_length);
}

function show_desc_info() {

    // loop through use object and get all properties
    let properties = [];
    Object.keys(CUR_DESC).forEach(function(key) {

        if (['attempt_jsons', 'grid_desc', 'see_desc', 'do_desc', 'action_sequence', 'attempts_sequence', 'selected_ex', 'task',
            'succeeded_verification', 'type', 'bandit_attempts', 'bandit_success_score', 'display_num_attempts', 
            'display_num_success', 'num_verification_attempts'].includes(key) || CUR_DESC[key] == undefined) {
            // pass
        } else if (key == 'timestamp') {
            properties.push(`<li class="list-group-item"><b>${key}</b>: ${timeConverter(CUR_DESC[key])}</li>`);
        } else {
            properties.push(`<li class="list-group-item"><b>${key}</b>: ${CUR_DESC[key]}</li>`);
        }
    });

    // set html and show modal
    $("#build_or_desc_info").html(properties.join(''));
    $("#info_modal_title").text("Description data");
    $("#info-modal").modal("show");
}

/**
 * Turn a timestamp into a readable string
 * @param {number} UNIX_timestamp the timestamp to convert
 * @returns {string} the string displaying the date
 */
function timeConverter(UNIX_timestamp){
    var a = new Date(UNIX_timestamp * 1000);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var date = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes();
    var sec = a.getSeconds();
    var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;
    return time;
  }

function show_build_info(i) {
    const build = BUILDS[i];
    // loop through use object and get all properties
    let properties = [];
    Object.keys(BUILDS[i]).forEach(function(key) {

        if (['attempt_jsons', 'action_sequence', 'desc_type', 'task', 'success'].includes(key) || build[key] == undefined) {
            // pass
        } else if (key == 'timestamp') {
            properties.push(`<li class="list-group-item"><b>${key}</b>: ${timeConverter(build[key])}</li>`);
        } else {
            properties.push(`<li class="list-group-item"><b>${key}</b>: ${build[key]}</li>`);
        }
    });

    // set html and show modal
    $("#build_or_desc_info").html(properties.join(''));
    $("#info_modal_title").text("Description data");
    $("#info-modal").modal("show");
}
