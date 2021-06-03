var ATTEMPT_JSONS = [];

var DESC_ID;

var IS_VERIFICATION;
var uid;
var maxIdleTime = 0;

var TIMING_CREDIT;

$(window).on('load', function () {

    uid = sessionStorage.getItem('uid') || uuidv4() + "dev";

    // get date for making sure they try before giving up
    START_DATE = new Date();

    // initialize correct database
    const study_name = sessionStorage.getItem('study') || 'dev';
    let study = STUDY_BATCHES[study_name];
    TASKS = study.tasks;
    update_fb_config(study.config, study.name);
    console.log("Initialized " + study.name + " database");

    // show progress bar completion
    size_progress_bar();
    update_progress_bar();

    // parse url
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const task = urlParams.get('task') || TASKS[Math.floor(Math.random() * TASKS.length)].toString();
    const desc_id = urlParams.get('id');
    IS_VERIFICATION = (urlParams.get('ver') == 'true');
    if (desc_id == null && !IS_VERIFICATION) {
        errorMsg("You must provide a description id in the URL");
        throw  "You must provide a description id in the URL";
    }

    DESC_ID = desc_id;
    TASK_ID = task;
    loadTask(task);

    DESCRIPTIONS_TYPE = sessionStorage.getItem('type') || "nl";
    switch (DESCRIPTIONS_TYPE) {
        case "nl":
            $("#examples_area").remove();
            break;
        case "nl_ex":
            break;
        case "ex":
            break;
        default:
            break;
    }

    // if using their own description as a verification for that description, load it from urlparams
    // if not, load from DB and give instructions
    if (IS_VERIFICATION) {
        maxIdleTime = parseInt(urlParams.get('maxIdle')) || 0;

        const grid_desc = urlParams.get('grid') || "";
        const see_desc = urlParams.get('see') || "";
        const do_desc = urlParams.get('do') || "";
        const selected_example = urlParams.get('se') || "0";

        sessionStorage.setItem('done_speaker_task', true);

        $("#grid_size_p").text(grid_desc);
        $("#see_p").text(see_desc);
        $("#do_p").text(do_desc);

        $("#objective-text").text("Use the description you just wrote to create the correct output for the new input.");
        $('#verInstructionsModal').modal('show');
    } else {
        get_description_by_id(task, desc_id, DESCRIPTIONS_TYPE).then(description => {
            loadTask(task);

            if (description.see_description == "") {
                $("#grid_size_p").text("This description has no language. Use just the shown example to guess the output.");
                $("#see_p").text("");
                $("#do_p").text("");
            } else {
                $("#grid_size_p").text(description.grid_desc);
                $("#see_p").text(description.see_desc);
                $("#do_p").text(description.do_desc);
            }
        }).catch(error => {
            console.error(error);
            errorMsg("Failed to load the task. Please ensure your internet connection and try again. If the issue persists, please email samacqua@mit.edu");
        });
        $('#instructionsModal').modal('show');
    }

    // add to list of tasks completed , so we don't give same task
    var tasks_done = (sessionStorage.getItem('tasks_completed') || "").split(',');
    tasks_done.push(TASK_ID);
    sessionStorage.setItem('tasks_completed', tasks_done);

    // get timing data for the task to determine amount towards completion
    TIMING_CREDIT = IS_VERIFICATION ? SPEAKER_TIME*60 : BUILDER_TIME*60;
    let all_past_times = [];
    get_timing_doc(DESCRIPTIONS_TYPE).then(timing_doc => {
        $.each(timing_doc, function(key, value) {
            if (IS_VERIFICATION) {
                if (key.includes(TASK_ID.toString()) && key.includes("desc")) {
                    all_past_times.push(value);
                }
            } else {
                if (key.includes(TASK_ID.toString()) && key.includes("attempts")) {
                    all_past_times.push(...value);
                }
            }
        });
        TIMING_CREDIT = weight_timing(all_past_times, TIMING_CREDIT, summed=false);
    }).catch(error => {
        console.error("Error getting past description timing: ", error);
    });

});

//  Make it so modal with sliders has labels of slider values
$(document).ready(function () {
    $("#conf_result").html($("#conf_form").val());
    $("#conf_form").change(function(){
        $("#conf_result").html($(this).val());
    });
});

// get the max amount of time doing nothing (to nearest 5 seconds)
var idleTime = 0;
$(document).ready(function () {
    //Increment the idle time counter every 5 seconds.
    var resolution = 5;
    var idleInterval = setInterval(function() { idleTime += resolution; }, resolution*1000);

    //Zero the idle timer on mouse movement.
    $(this).mousemove(function (e) {
        if (idleTime > maxIdleTime) {
            maxIdleTime = idleTime;
        }
        idleTime = 0;
    });
    $(this).keypress(function (e) {
        if (idleTime > maxIdleTime) {
            maxIdleTime = idleTime;
        }
        idleTime = 0;
    });
    $(this).click(function (e) {
        if (idleTime > maxIdleTime) {
            maxIdleTime = idleTime;
        }
        idleTime = 0;
    });
});

var SENDING_TO_NEXT = false;    // while waiting for async calls, don't let user submit multiple times
function check() {
    /**
     * check if output grid same as correct answer. if so, store info and move to next task
     */
    if (SENDING_TO_NEXT) {
        return;
    }
    update_grid_from_div($(`#output_grid .editable_grid`), CURRENT_OUTPUT_GRID);
    reference_output = TEST_PAIR.output.grid;
    submitted_output = CURRENT_OUTPUT_GRID.grid;

    for (i=0;i<ATTEMPT_JSONS.length;i++) {
        if (ATTEMPT_JSONS[i] == JSON.stringify(submitted_output)) {
            errorMsg("You have already tried this grid. Try a different output before checking your answer.");
            return;
        }
    }

    // have to store as json string bc firebase cannot store nested arrays
    ATTEMPT_JSONS.push(JSON.stringify(submitted_output));

    if (reference_output.length != submitted_output.length || reference_output[0].length != submitted_output[0].length) {
        errorMsg(`Wrong answer. Try again. You have ${MAX_ATTEMPTS_BUILDER - ATTEMPT_JSONS.length} attempts left.`);
        ATTEMPTS_SEQUENCE.push({
            "action": {"tool": "check", "correct": false},
            "grid": array_copy(CURRENT_OUTPUT_GRID.grid),
            "time": (new Date() - START_DATE) / 1000
        });
            // used all attempts
        if (ATTEMPT_JSONS.length == MAX_ATTEMPTS_BUILDER) {
            SENDING_TO_NEXT = true;
            used_all_attempts();
        }
        return;
    }

    for (var i = 0; i < reference_output.length; i++) {
        ref_row = reference_output[i];
        for (var j = 0; j < ref_row.length; j++) {
            if (ref_row[j] != submitted_output[i][j]) {
                errorMsg(`Wrong answer. Try again. You have ${MAX_ATTEMPTS_BUILDER - ATTEMPT_JSONS.length} attempts left.`);
                ATTEMPTS_SEQUENCE.push({
                    "action": {"tool": "check", "correct": false},
                    "grid": array_copy(CURRENT_OUTPUT_GRID.grid),
                    "time": (new Date() - START_DATE) / 1000
                });
                // used all attempts
                if (ATTEMPT_JSONS.length == MAX_ATTEMPTS_BUILDER) {
                    SENDING_TO_NEXT = true;
                    used_all_attempts();
                }
                return;
            }
        }
    }

    ATTEMPTS_SEQUENCE.push({
        "action": {"tool": "check", "correct": true},
        "grid": array_copy(CURRENT_OUTPUT_GRID.grid),
        "time": (new Date() - START_DATE) / 1000
    });

    SENDING_TO_NEXT = true;
    infoMsg("Correct!");

    const newDate = new Date();
    const build_time = (newDate - START_DATE) / 1000;

    if (IS_VERIFICATION) {
        $("#speaker_certainty_modal").modal('show');
    } else {

        show_loader();

        get_description_by_id(TASK_ID, DESC_ID, DESCRIPTIONS_TYPE).then(desc_to_update => {
            get_task_best_desc(TASK_ID, DESCRIPTIONS_TYPE).then(task_best => {

                let a = task_best.success_score + PRIORS[0];
                let b = (task_best.attempts - task_best.success_score) + PRIORS[1];
    
                let mean = a / (a + b);
                task_best.mean = mean;

                store_listener(DESC_ID, TASK_ID, uid, ATTEMPT_JSONS.length, ATTEMPT_JSONS, JSON.stringify(ATTEMPTS_SEQUENCE), build_time, true, DESCRIPTIONS_TYPE, maxIdleTime, task_best, desc_to_update, null, null)
                .then(function () { 
                    set_user_complete_time(uid, build_time, `${TASK_ID}_${DESCRIPTIONS_TYPE}_listener`).then(function() {
                        next_task(TIMING_CREDIT / 60); 
                    }).catch(function (error) { console.error('Error storing response ' + error); });
                })
                .catch(function (error) { console.error("Error storing response: " + error); });
    
            }).catch(err => {
                console.error(err);
            });
        });
    }
}

function submit_description() {

    show_loader();

    const newDate = new Date();
    const verification_time = (newDate - START_DATE) / 1000;
            
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);

    // get all stats/vals
    const grid_desc = urlParams.get('grid') || "";
    const see_desc = urlParams.get('see') || "";
    const do_desc = urlParams.get('do') || "";
    const desc_time = parseInt(urlParams.get('time') || "0");
    const total_time = verification_time + desc_time;
    const conf = parseInt($('#conf_form').val().trim());

    if (conf <= MIN_CONFIDENCE) {
        store_failed_ver_description(see_desc, do_desc, grid_desc, TASK_ID, uid, conf, ATTEMPT_JSONS.length, ATTEMPT_JSONS, JSON.stringify(ATTEMPTS_SEQUENCE), desc_time, verification_time, null, DESCRIPTIONS_TYPE, maxIdleTime)
        .then(function () { 
            set_user_complete_time(uid, total_time, `${TASK_ID}_${DESCRIPTIONS_TYPE}_speaker_(low_conf)`).then(function() {
                next_task(TIMING_CREDIT/60);
            }).catch(function (error) { console.error('Error storing response ' + error); });
        })
        .catch(function (error) { console.error('Error storing response ' + error); });
    } else {
        store_description(see_desc, do_desc, grid_desc, TASK_ID, uid, conf, ATTEMPT_JSONS.length, ATTEMPT_JSONS, JSON.stringify(ATTEMPTS_SEQUENCE), desc_time, verification_time, null, DESCRIPTIONS_TYPE, maxIdleTime)
        .then(function () {
            set_user_complete_time(uid, total_time, `${TASK_ID}_${DESCRIPTIONS_TYPE}_speaker`).then(function() {
                next_task(TIMING_CREDIT/60);
            }).catch(function (error) { console.error('Error storing response ' + error); });
        })
        .catch(function (error) { console.error('Error storing response ' + error); });
    }
}

function used_all_attempts() {
    const build_time = ((new Date()) - START_DATE) / 1000;
    errorMsg("Wrong answer. You have used all of your attempts.");

    if (IS_VERIFICATION) {

        show_loader();
                    
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
    
        const grid_desc = urlParams.get('grid') || "";
        const see_desc = urlParams.get('see') || "";
        const do_desc = urlParams.get('do') || "";
        const desc_time = parseInt(urlParams.get('time') || "0");
    
        store_failed_ver_description(see_desc, do_desc, grid_desc, TASK_ID, uid, null, ATTEMPT_JSONS.length, ATTEMPT_JSONS, JSON.stringify(ATTEMPTS_SEQUENCE), desc_time, build_time, null, DESCRIPTIONS_TYPE, maxIdleTime)
        .then(function () {
            set_user_complete_time(uid, desc_time+build_time, `${TASK_ID}_${DESCRIPTIONS_TYPE}_speaker_(fail)`).then(function() {
                next_task(TIMING_CREDIT*SPEAKER_FAIL_PART_CRED / 60);
            }).catch(function (error) { console.error('Error storing response ' + error); });
        })
    .catch(function (error) { console.error('Error storing response ' + error); });
    } else {
        show_recap_modal();
    }
}

function exit_recap_modal() {

    let checked_val = $('input[name=exampleRadios]:checked', '#myForm').val();

    if (checked_val == undefined) {
        errorMsg("Please select an option about how good the description is.");
        return;
    }
    $("#fail_recap_modal").modal('hide');

    checked_val = (checked_val == 'true') ? true : false;    
    show_loader();

    const build_time = ((new Date()) - START_DATE) / 1000;

    get_description_by_id(TASK_ID, DESC_ID, DESCRIPTIONS_TYPE).then(desc_to_update => {
        get_task_best_desc(TASK_ID, DESCRIPTIONS_TYPE).then(task_best => {
            
            let a = task_best.success_score + PRIORS[0];
            let b = task_best.attempts - task_best.success_score + PRIORS[1];

            let mean = a / (a + b);
            task_best.mean = mean;

            store_listener(DESC_ID, TASK_ID, uid, ATTEMPT_JSONS.length, ATTEMPT_JSONS, JSON.stringify(ATTEMPTS_SEQUENCE), build_time, success = false, DESCRIPTIONS_TYPE, maxIdleTime, task_best, desc_to_update, checked_val, $("#build_recap_textarea").val())
            .then(function () { 
                set_user_complete_time(uid, build_time, `${TASK_ID}_${DESCRIPTIONS_TYPE}_listener_(fail)`).then(function() {
                    next_task(TIMING_CREDIT / 60); 
                }).catch(function (error) { console.error('Error storing response ' + error); });
            })
            .catch(function (error) { console.error("Error storing response: " + error); });
        }).catch(err => {
            console.error(err);
        });

    });
}

function show_recap_modal() {
    fill_div_with_IO($("#test-io-preview"), TEST_PAIR.input, TEST_PAIR.output);
    show_attempts();
    $("#grid_size_p_recap").text($("#grid_size_p").text());
    $("#see_p_recap").text($("#see_p").text());
    $("#do_p_recap").text($("#do_p").text());
    $("#fail_recap_modal").modal('show');
}

function show_attempts() {

    let attempts_json = ATTEMPT_JSONS;

    $.each(attempts_json, (i, attempt) => {
        attempt = JSON.parse(attempt);
        let grid = array_to_grid(attempt);
        let grid_div = $(`#attempt${i+1}`);
        fill_div_with_grid(grid_div, grid);
        fit_cells_to_container(grid_div, grid.height, grid.width);
    });
}