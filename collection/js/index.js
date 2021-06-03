var QUIZ_QUESTIONS;

$(window).on('load', function () {

    PAGE = Pages.Intro

    // correctly size the progress bar
    size_progress_bar();

    // start timer to gather data on total time per user
    sessionStorage.setItem('start_time', (new Date()).getTime());

    // load first practice task
    const task = PRAC_TASKS.shift();
    loadTask(task.task);
    $("#grid_size_p").text(task.grid_desc);
    $("#see_p").text(task.see_desc);
    $("#do_p").text(task.do_desc);

    // initialize time spent for credit towards completion
    sessionStorage.setItem("time_complete", "0");

    // get the type of descriptions (nl, nl_ex, ex)
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    DESCRIPTIONS_TYPE = urlParams.get('type') || "nl";
    sessionStorage.setItem('type', DESCRIPTIONS_TYPE);

    // initialize firebase to correct database
    var study_name = urlParams.get('study') || "dev";
    if (!(study_name in STUDY_BATCHES)) {
        study_name = 'dev';
    }
    sessionStorage.setItem('study', study_name);

    let study = STUDY_BATCHES[study_name];
    TASKS = study.tasks;
    update_fb_config(study.config, study.name);
    console.log("Initialized " + study.name + " database");
    if (study_name == 'dev') {
        $("#ongoing-study-modal").modal('show');
    } else {
        $('#consentModal').modal('show');
    }

    // assign a random id to the user
    const uid = uuidv4();
    sessionStorage.setItem("uid", uid);
    set_user_start_time(uid);

    // format walkthrough/tutorial based on description type
    format_walkthrough(DESCRIPTIONS_TYPE);
    format_desc_area(DESCRIPTIONS_TYPE);
    set_objective(DESCRIPTIONS_TYPE);

    // set up quiz
    QUIZ_QUESTIONS = GEN_QUIZ_QUESTIONS;
    var quizContainer = document.getElementById('quiz');
    showQuestions(QUIZ_QUESTIONS, quizContainer);

    // check if study complete
    check_if_study_complete().then((complete) => {
        if (complete) {
            setTimeout(function () {
                $('#consentModal').modal('hide');
                $('#study_complete_modal').modal('show');
            }, 500);
        }
    });
});

// get the max amount of time doing nothing (to nearest 5 seconds)
var idleTime = 0;
var maxIdleTime = 0;
$(document).ready(function () {
    //Increment the idle time counter every 5 seconds.
    var resolution = 5;
    setInterval(function() { idleTime += resolution; }, resolution*1000);

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

    // listen for click on tut layer
    $("#tut-layer").click(function () {
        pre_continue();
    });
});

// =======================
// Format based on description type
// =======================

/**
 * show the correct intro modal based on description type
 */
function show_intro() {
    const introModalID = 'IntroModal';
    $('#consentModal').one('hidden.bs.modal', function () { $('#' + introModalID).modal('show'); }).modal('hide');
}

/**
 * set the objective based on the description type
 * @param {string} desc_type the type of descriptions ("nl", "ex", or "nl_ex")
 */
function set_objective(desc_type) {
    switch (desc_type) {
        case "nl":
            $("#objective-text").html('Create the correct output based on the description and input grid.');
            break;
        case "nl_ex":
            $("#objective-text").html('Create the correct output based on the description, example transformation, and input grid.');
            break;
        case "ex":
            $("#objective-text").html('Create the correct output based on the example transformation.');
            break;
        default:
            console.error("Unknown description type");
            break;
    }
}

/**
 * format the description area based on the description type
 * @param {string} desc_type the type of descriptions ("nl", "ex", or "nl_ex")
 */
function format_desc_area(desc_type) {
    if (desc_type == "nl") {
        // remove examples area
        $("#examples_area").remove();
    } else if (desc_type == "ex") {
        // remove description
        $("#description-text").remove();
    }
}

/**
 * Adds the correct walkthrough steps depending on the description type
 * @param {string} desc_type the type of descriptions ("nl", "ex", or "nl_ex")
 */
function format_walkthrough(desc_type) {
    for (i = 0; i < TUT_LIST.length; i++) {
        if (arraysEqual(TUT_LIST[i][1], ["objective-col"])) {
            switch (desc_type) {
                case "nl":
                    TUT_LIST.splice(i + 1, 0,
                        ["This is the description area. This is where the pattern is described.", ["description-col"], 30, 35, 10],
                        ["This is the description, which is written by another person.", ["description-text"], 30, 35, 10]);
                    break;
                case "nl_ex":
                    TUT_LIST.splice(i + 1, 0,
                        ["This is the description area. This is where the pattern is described.", ["description-col"], 30, 35, 10],
                        ["This is the description, which is written by another person.", ["description-text"], 30, 35, 10],
                        ["This is the examples area, which is where there will be an example of the transformation.", ["examples_area"], 30, 35, 10]);
                    break;
                case "ex":
                    TUT_LIST.splice(i + 1, 0,
                        ["This is the examples area. This is where an example of the pattern is shown.", ["description-col"], 30, 35, 10]);
                    break;
                default:
                    console.error("Unknown description type");
                    break;
            }
        }
    }
}

// =======================
// Tutorial
// =======================

// each tutorial item has format: [step text, list of elements to highlight, top offset of message (pxs), left offset (%), right offset (%)]
var TUT_LIST = [
    ["You will now be walked through the layout. Click any of the un-highlighted area to continue.", [], 30, 20, 20],
    ["If you notice any issues with the study, please report it by pressing this button.", ["feedback_btn"], 20, 35, 10],
    ["This is the Objective bar. This is where your task will be written.", ["objective-col"], 30, 20, 20],
    ["This is the input area. You will apply the pattern to this grid.", ["input-col"], 30, 5, 70],
    ["This is the output area. This is where you will create the correct output grid. Let's break it down a little more...", ["output-col"], 30, 10, 35],
    ["This is where you can change the grid size.", ["resize_control_btns"], 50, 5, 35],
    ["With these buttons, you can copy the entire input grid or make the entire output grid black.", ["edit_control_btns"], 60, 5, 35],
    ["Since the description says the output grid is the same size as the input grid, use 'Copy input grid' to make the correct output grid size.", ["grid_size_p", "input-col", "copy-from-input", "output_grid", "objective-col"], 30, 100, 100],
    ["These modes are how you change the output grid.", ["toolbar_and_symbol_picker"], 60, 5, 35],
    ["With the draw mode, you can edit individual pixels.", ["draw"], 60, 5, 35],
    ["With flood fill, you can fill in entire areas.", ["floodfill"], 60, 5, 35],
    ["With copy-paste, you can copy a part of the grid by dragging over the area and pressing 'C'. You can paste the copied grid by selecting where you want to paste it, and pressing 'V'.", ["copypaste"], 60, 5, 35],
    ["Use <b>flood fill</b> to fill each 'hole' with yellow.", ["description-text", "toolbar_and_symbol_picker", "output_grid", "objective-col"], 30, 100, 100],
    ["You have now successfully used the description to create the output. Use the green 'Check!' button to check your answer!", ["objective-col", "input-col", "description-col", "output-col"], 500, 100, 100],
];

// set up grid listeners


// after some tasks, slight delay to ease transitions for user
// this variable ensures they do not skip tutorial steps
var WAITING_TO_CONTINUE = false;
var LAST_YELLOW_SUM = 33;
var YELLOW_SUM = 0; // sum of yellow squares filled, informs the error message given to the user

/**
 * Before continuing the tutorial, checks if there is a task to complete
 * If so, check if completed task/give user incremental feedback
 * flag -- if == 'check', know user checked grid / can continue
 */
function pre_continue(flag = null) {

    // check if done with tutorial, because copy, reset, and resize all call pre-continue (so user does not have to click to continue)
    if (FINISHED_TUT || WAITING_TO_CONTINUE) {
        return;
    }

    // if length > 1, then the tutorial is giving them a problem, so don't check if they have completed it before continuing
    if (CUR_HIGHLIGHT.length > 1) {

        update_grid_from_div($(`#output_grid .editable_grid`), CURRENT_OUTPUT_GRID);

        // challenge to copy from input
        if (arraysEqual(CUR_HIGHLIGHT, ["grid_size_p", "input-col", "copy-from-input", "output_grid", "objective-col"])) {
            if (arraysEqual(CURRENT_OUTPUT_GRID.grid, TEST_PAIR.input.grid)) {
                infoMsg("Great job! You have copied from the input grid.");
                WAITING_TO_CONTINUE = true;
                setTimeout(function () { continue_tutorial(); }, 1000);
                $("#tool_floodfill").click();
                return;
            }
        // challenge to flood fill yellow
        } else if (arraysEqual(CUR_HIGHLIGHT, ["description-text", "toolbar_and_symbol_picker", "output_grid", "objective-col"])) {

            const ref_grid = TEST_PAIR.output.grid;

            let mode = $('input[name=tool_switching]:checked').val();
            if (mode != 'floodfill') {
                errorMsg("Make sure that you are in 'floodfill' mode.");
                return;
            }
                
            for (var i = 0; i < CURRENT_OUTPUT_GRID.grid.length; i++) {
                let ref_row = CURRENT_OUTPUT_GRID.grid[i];
                for (var j = 0; j < ref_row.length; j++) {
                    if (ref_row[j] != ref_grid[i][j]) {

                        if (ref_row[j] == 0 && ref_grid[i][j] == 4) {
                            YELLOW_SUM++;
                            continue;
                        }
                        // if cell is incorrect and is not yellow
                        errorMsg("Only fill inside the holes with yellow.");
                        LAST_YELLOW_SUM = YELLOW_SUM;
                        YELLOW_SUM = 0;
                        return;
                    }
                }
            }
            for (var i = 0; i < CURRENT_OUTPUT_GRID.grid.length; i++) {
                let ref_row = CURRENT_OUTPUT_GRID.grid[i];
                for (var j = 0; j < ref_row.length; j++) {
                    if (ref_row[j] != ref_grid[i][j]) {
                        if (YELLOW_SUM < LAST_YELLOW_SUM) { // made progress
                            infoMsg("Great! Continue filling in the holes with yellow.");
                        } else {
                            errorMsg("There are still some holes that have not been filled with yellow...");
                        }
                        LAST_YELLOW_SUM = YELLOW_SUM;
                        YELLOW_SUM = 0;
                        return;
                    }
                }
            }
            infoMsg("Great job! You used flood fill.");
            WAITING_TO_CONTINUE = true;
            setTimeout(function () { continue_tutorial(); }, 1000);
            return;
        } else if (arraysEqual(CUR_HIGHLIGHT, ["objective-col", "input-col", "description-col", "output-col"])) {
            if (flag == "check") {
                infoMsg("You successfully completed your first task!");
                WAITING_TO_CONTINUE = true;
                setTimeout(function () { continue_tutorial(); }, 1500);
                return;
            }
        }
        errorMsg("Follow the objective.");
    } else {
        // not a challenge, so continue the tutorial
        continue_tutorial();
    }
}

var CUR_HIGHLIGHT = null;   // currently highlighted elements in tutorial
var FINISHED_TUT = false;

function continue_tutorial() {

    WAITING_TO_CONTINUE = false;

    // set last item to be behind dark layer
    if (CUR_HIGHLIGHT != null) {
        for (i = 0; i < CUR_HIGHLIGHT.length; i++) {
            if (CUR_HIGHLIGHT[i] != "feedback_btn") {
                $(`#${CUR_HIGHLIGHT[i]}`).css('position', 'static');
            }
            $(`#${CUR_HIGHLIGHT[i]}`).css('z-index', 'auto');
        }
    }

    // if last one, then get rid of dark layer
    if (TUT_LIST.length == 0) {
        $("#trans-layer").css('z-index', -1);
        $("#dark-layer").css('z-index', -1);
        $("#dark-layer").css('background-color', 'white');
        $("#tut-message").css('z-index', -2);
        $("#tut-continue-message").css('z-index', -2);
        $("#tut-continue-message").css('background', 'rgba(0,0,0,0.0)');

        // store time and show quiz
        send_user_complete_item('walkthrough_time', false);
        $("#quiz_modal").modal("show");

        // set objective
        switch (DESCRIPTIONS_TYPE) {
            case "nl":
                $("#objective-text").html('Create the correct output based on the description and input grid.');
                break;
            case "nl_ex":
                $("#objective-text").html('Create the correct output based on the description, example transformation, and input grid.');
                break;
            case "ex":
                $("#objective-text").html('Create the correct output based on the example transformation.');
                break;
            default:
                break;
        }

        FINISHED_TUT = true;
        return;
    }

    // set dark layer and message
    const next_item = TUT_LIST.shift();
    $("#dark-layer").css('z-index', 500);
    $("#dark-layer").css('background-color', 'rgba(0,0,0,0.7)');
    $("#trans-layer").css('z-index', 503);
    $("#tut-message").css('z-index', 502);
    $("#tut-message").css('top', `${next_item[2]}%`);
    $("#tut-message").css('left', `${next_item[3]}%`);
    $("#tut-message").css('right', `${next_item[4]}%`);
    $("#tut-message").html(next_item[0]);
    $("#tut-continue-message").css('z-index', 502);
    $("#tut-continue-message").css('top', `calc(${next_item[2]}% + ${$("#tut-message").outerHeight() + 10}px)`);
    $("#tut-continue-message").css('background', 'rgba(0,0,0,0.7)');
    $("#tut-continue-message").html('Click anywhere to continue');
    $("#tut-continue-message").css('left', `${next_item[3]}%`);


    if (next_item[1].length > 1) {
        $("#objective-text").html(next_item[0]);
        $("#trans-layer").css('z-index', -1);
        $("#tut-continue-message").html('Follow the Objective to continue');
    }
    
    // set highlight div to be above layer
    var max_top = 100000;
    var max_id = "";
    for (i = 0; i < next_item[1].length; i++) {
        const id = next_item[1][i];

        if (id != "feedback_btn") {
            $(`#${id}`).css('position', 'relative');
        }
        $(`#${id}`).css('z-index', '501');

        if ($('#' + id).offset().top < max_top) {
            max_top = $('#' + id).offset().top;
            max_id = id;
        }
    }

    // scroll to top highlighted element
    if (max_id != "") {
        $([document.documentElement, document.body]).animate({
            scrollTop: $('#' + max_id).offset().top - 10
        }, 1000);
    }

    CUR_HIGHLIGHT = next_item[1];

    if (arraysEqual(CUR_HIGHLIGHT, ["objective-col", "input-col", "description-col", "output-col"])) {
        highlight_element("#check-btn", 10000);
    }
}

// =======================
// ARC Completion
// =======================

/**
 * checks if output is correct. If so and completed enough tasks, move on to actual task
 */
function check_grid() {
    update_grid_from_div($(`#output_grid .editable_grid`), CURRENT_OUTPUT_GRID);
    reference_output = TEST_PAIR.output.grid;
    submitted_output = CURRENT_OUTPUT_GRID.grid;

    if (reference_output.length != submitted_output.length) {
        errorMsg("Wrong answer. Try again.");
        return
    }

    for (var i = 0; i < reference_output.length; i++) {
        ref_row = reference_output[i];
        for (var j = 0; j < ref_row.length; j++) {
            if (ref_row[j] != submitted_output[i][j]) {
                errorMsg("Wrong answer. Try again.");
                return
            }
        }
    }
    
    // don't increment time for walkthrough
    if (PRAC_TASKS.length == 0) {
        update_progress_bar(inc=PRAC_TASK_TIME);
    }
    scroll_highlight_objective();

    // if not last practice task
    if (PRAC_TASKS.length != 0) {

        $("#give_up_vid").attr('src', `img/give_up.mp4`);

        infoMsg("Correct! Solve " + (PRAC_TASKS.length).toString() + " more problem(s).");

        // reset values
        resetOutputGrid();
        TEST_PAIR = {"input": new Grid(3, 3), "output": new Grid(3, 3)};

        // load task
        const task = PRAC_TASKS.shift();
        loadTask(task.task);
        $("#grid_size_p").text(task.grid_desc);
        $("#see_p").text(task.see_desc);
        $("#do_p").text(task.do_desc);

        return;
    }

    send_user_complete_item('practice_task_time', false);
    window.clearTimeout(GIVE_UP_HINT);

    $("#done_modal").modal("show");
}

// =======================
// Store user time information
// =======================

var SECTION_START_TIME = 0;

var START_WALKTHROUGH_TIME = 0;
var START_QUIZ_TIME = 0;
var START_PRAC_TASK_TIME = 0;

var GIVE_UP_HINT;

function send_user_complete_item(item, from_start) {
    const uid = sessionStorage.getItem('uid') || uuidv4() + "dev";

    var start_time = SECTION_START_TIME;
    if (from_start) {
        start_time = parseInt(sessionStorage.getItem('start_time')) || 0;
    }

    const end_time = (new Date()).getTime();
    const delta = (end_time - start_time) / 1000;

    SECTION_START_TIME = end_time;
    set_user_complete_time(uid, delta, item);
}

/**
 * store total time and move to next task after closing final modal
 */
function exit_done_modal() {
    const uid = sessionStorage.getItem('uid') || uuidv4() + "dev";
    set_user_complete_time(uid, maxIdleTime, 'max_idle_time');
    send_user_complete_item('tutorial_total_time', true);
    show_loader();
    next_task(0);
}

// =======================
// Quiz
// =======================

function showQuestions(questions, quizContainer) {
    /*
    For quiz
    */
    // we'll need a place to store the output and the answer choices
    var output = [];
    var answers;

    // for each question...
    for (var i = 0; i < questions.length; i++) {

        // first reset the list of answers
        answers = [];

        // for each available answer to this question...
        for (letter in questions[i].answers) {

            // ...add an html radio button
            answers.push(
                '<label>'
                + '<input type="radio" name="question' + i + '" value="' + letter + '">'
                + letter + ': '
                + questions[i].answers[letter]
                + '</label>'
            );
        }

        // add this question and its answers to the output
        output.push(
            '<div class="question">' + questions[i].question + '</div>'
            + '<div class="answers">' + answers.join('') + '</div>'
            + '<hr>'
        );
    }

    // finally combine our output list into one string of html and put it on the page
    quizContainer.innerHTML = output.join('');
}

function check_quiz() {
    // gather answer containers from our quiz and check if correct
    var quizContainer = document.getElementById('quiz');
    var answerContainers = quizContainer.querySelectorAll('.answers');

    let num_incorrect = 0;
    for (var i = 0; i < QUIZ_QUESTIONS.length; i++) {
        userAnswer = (answerContainers[i].querySelector('input[name=question' + i + ']:checked') || {}).value;
        if (userAnswer != QUIZ_QUESTIONS[i].correctAnswer) {
            num_incorrect++;     
        }
    }
    if (num_incorrect > 0) {
        errorMsg("You incorrectly answered " + (num_incorrect).toString() + " questions. Please retry the quiz.");
        return;
    }

    $('#quiz_modal').one('hidden.bs.modal', function () { $('#instructionsModal').modal('show'); }).modal('hide');

    // reset grid
    $("#output_grid_size").val("3x3");
    resizeOutputGrid();
    resetOutputGrid();

    $("#tool_edit").click();
}
