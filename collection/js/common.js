var DESCRIPTIONS_TYPE = "nl";  // the type of descriptions ("nl", "ex", or "nl_ex")
var PAGE;
var START_DATE;


function check_if_study_complete() {
    return new Promise(function (resolve, reject) {
        select_casino('nl').then(cas => {
            if (cas == -1) {
                return resolve(true);
            } else {
                return resolve(false);
            }
        });
    });
}

function print_timings(desc_type, is_desc) {
    const timing_credit = is_desc ? SPEAKER_TIME*60 : BUILDER_TIME*60
    get_timing_doc(desc_type).then(timing_doc => {

        $.each(TASKS, function(i, task) {
            console.log(task);
            var task_times = [];
            $.each(timing_doc, function(key, value) {
                if (is_desc) {
                    if (key.includes(task.toString()) && key.includes("desc")) {
                        task_times.push(value);
                    }
                } else {
                    if (key.includes(task.toString()) && key.includes("attempts")) {
                        task_times.push(...value);
                    }
                }
            });
            weighted_credit = weight_timing(task_times, timing_credit, summed=false);
        });
    }).catch(error => {
        console.error("Error getting past description timing: ", error);
    });
}

function add_grid_hover_listeners() {
    $(".pair_preview").hover(function() {
        $(this).css("background-color", "rgb(160, 160, 160)");
    }, function(){
        $(this).css("background-color", "rgb(200, 200, 200)");
    });

    $(".pair_preview").click(function(e) {
        if ($("#grid-focus").is(":hidden")) {
            e.stopPropagation();
        }
        $("#grid-focus").fadeIn();
        $("#grid-focus-container").html(this.innerHTML);
    });

    $(document).click(function(e) {
        $('#grid-focus').fadeOut();
     });
}

var LAST_MSG_DISMISS_CALL_TIME = new Date();    // timestamp to ensure that messages fade out at correct time
/**
 * show an error message at the top of the screen.
 * @param {string} msg the message to display
 */
function errorMsg(msg) {
    $('#error_display').hide();
    $('#info_display').hide();

    // console.warn(msg);

    $('#error_display').html(msg);
    $('#error_display').css({ "visibility": "visible" });
    $('#error_display').fadeIn(300);

    const dismiss_call_time = new Date();
    LAST_MSG_DISMISS_CALL_TIME = dismiss_call_time;

    setTimeout(function () {
        // only fade out if no new message has been shown since since timeout started
        if (LAST_MSG_DISMISS_CALL_TIME == dismiss_call_time) {
            $('#error_display').fadeOut(300);
        }
    }, 6000);
}

/**
 * show an info message at the top of the screen.
 * @param {string} msg the message to display
 */
function infoMsg(msg) {
    $('#error_display').hide();
    $('#info_display').hide();

    // console.log(msg);

    $('#info_display').html(msg);
    $('#info_display').css({ "visibility": "visible" });
    $('#info_display').fadeIn(300);

    const dismiss_call_time = new Date();
    LAST_MSG_DISMISS_CALL_TIME = dismiss_call_time;

    setTimeout(function () {
        // only fade out if no new message has been shown since since timeout started
        if (LAST_MSG_DISMISS_CALL_TIME == dismiss_call_time) {
            $('#info_display').fadeOut(300);
        }
    }, 6000);
}

/**
 * Checks equality of two arrays
 */
/**
 * Check for equality between two arrays
 * @param {Array} a1 the first array
 * @param {Array} a2 the second array
 */
function arraysEqual(a1, a2) {
    /* WARNING: arrays must not contain {objects} or behavior may be undefined */
    return JSON.stringify(a1) == JSON.stringify(a2);
}

/**
 * Shuffles array in place. from https://stackoverflow.com/a/6274381/5416200
 * @param {Array} a the array to shuffle
 */
function shuffle(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

/**
 * Set user complete time and show them the demographics modal
 */
function finish() {

    $("#loader").fadeOut();

    const uid = sessionStorage.getItem('uid') || "no uid";
    $("#finish_modal_uid").text(uid.toString());
    $("#demographic_modal").modal('show');

    update_progress_bar();

    const end_time = (new Date()).getTime();
    const delta_time = (end_time - parseInt(sessionStorage.getItem('start_time') || 0)) / 1000;

    set_user_complete_time(uid, delta_time, 'time_to_complete');
}

/**
 * scrape info from demographics modal and show user their ID
 */
function exit_demographic() {
    const gender = $('#gender_form').find("option:selected").text();
    const age = $('#age_form').val().trim();
    const uid = sessionStorage.getItem('uid') || uuidv4() + "dev";
    set_user_demographics(uid, age, gender, DESCRIPTIONS_TYPE);

    $('#demographic_modal').one('hidden.bs.modal', function () { $('#finished_modal').modal('show'); }).modal('hide');
}

/**
 * from final screen, store feedback user has provided
 */
function save_user_feedback() {
    store_feedback($("#feedback_textarea").val(), new Date(), sessionStorage.getItem('uid') || uuidv4() + "dev").then(function() {
        infoMsg("Successfully stored feedback. Thank you for your participation!");
        $("#submit_feedback_btn").prop("disabled", true);
    }).catch(err => {
        errorMsg("Error storing feedback.");
        console.error(err);
    });
}

/**
 * go to the next task, as calculated by the bandit
 * @param {number} time_inc the amount of time to increment towards completion for the user completing their last task
 */
function get_next_task(time_inc) {

    return new Promise(function (resolve, reject) {
        
        var time_complete = parseFloat(sessionStorage.getItem('time_complete') || 0);
        time_complete += time_inc;

        if (time_complete >= TOTAL_TIME) {
            return resolve('finish');
        }

        get_unused_desc(DESCRIPTIONS_TYPE).then(task_desc => {

            // if no unused descriptions, then use bandit
            if (task_desc == -1) {

                select_casino(DESCRIPTIONS_TYPE).then(task => {

                    if (task == -1) {
                        return resolve('finish');
                    }

                    select_arm(task, DESCRIPTIONS_TYPE).then(desc_id => {
                        // if desc_id == -1, then task needs new arm
                        if (desc_id == -1) {
                            return resolve(`speaker.html?task=${task}`);
                        } else {
                            return resolve(`listener.html?task=${task}&id=${desc_id}&ver=false`);
                        }
                    }).catch(error => {
                        console.error(error);
                        return;
                    });
                }).catch(error => {
                    console.error(error);
                    return;
                });

            // if unused description, immediately use that
            } else {
                const task = task_desc[0]
                const desc_id = task_desc[1]
                return resolve(`listener.html?task=${task}&id=${desc_id}&ver=false`);
            }

        }).catch(error => {
            console.error(error);
            return;
        });
    });
}

/**
 * go to the next task, as calculated by the bandit
 * @param {number} time_inc the amount of time to increment towards completion for the user completing their last task
 */
function next_task(time_inc) {

    var time_complete = parseFloat(sessionStorage.getItem('time_complete') || 0);
    time_complete += time_inc;
    sessionStorage.setItem('time_complete', time_complete);

    if (time_complete >= TOTAL_TIME) {
        finish();
        return;
    }

    get_unused_desc(DESCRIPTIONS_TYPE).then(task_desc => {

        // if no unused descriptions, then use bandit
        if (task_desc == -1) {

            select_casino(DESCRIPTIONS_TYPE).then(task => {

                if (task == -1) {
                    finish();
                    return;
                }

                select_arm(task, DESCRIPTIONS_TYPE).then(desc_id => {
                    // if desc_id == -1, then task needs new arm
                    if (desc_id == -1) {
                        window.location.href = `speaker.html?task=${task}`;
                    } else {
                        window.location.href = `listener.html?task=${task}&id=${desc_id}&ver=false`;
                    }
                }).catch(error => {
                    console.error(error);
                    return;
                });
            }).catch(error => {
                console.error(error);
                return;
            });

        // if unused description, immediately use that
        } else {
            const task = task_desc[0]
            const desc_id = task_desc[1]
            window.location.href = `listener.html?task=${task}&id=${desc_id}&ver=false`;
        }

    }).catch(error => {
        console.error(error);
        return;
    });
}

/**
 * scroll to and highlight the objective bar
 */
function scroll_highlight_objective() {
    $([document.documentElement, document.body]).animate({
        scrollTop: $('#objective-col').offset().top - 10
    }, 1000);

    $('#objective-col').css('-webkit-box-shadow', '0 0 40px purple');
    $('#objective-col').css('-moz-box-shadow', '0 0 40px purple');
    $('#objective-col').css('box-shadow', '0 0 40px purple');

    setTimeout(function () {
        $('#objective-col').css('-webkit-box-shadow', '0 0 0px rgba(0,0,0,0)');
        $('#objective-col').css('-moz-box-shadow', '0 0 0px rgba(0,0,0,0)');
        $('#objective-col').css('box-shadow', '0 0 0px rgba(0,0,0,0)');
    }, 2000);
}

/**
 * highlight an element by its id
 * @param {string} id the element's id
 * @param {number} time the amount of time (ms) to keep the element highlighted for
 */
function highlight_element(id, time) {
    $(id).css('-webkit-box-shadow', '0 0 40px green');
    $(id).css('-moz-box-shadow', '0 0 40px green');
    $(id).css('box-shadow', '0 0 40px green');

    setTimeout(function () {
        $(id).css('-webkit-box-shadow', '0 0 0px rgba(0,0,0,0)');
        $(id).css('-moz-box-shadow', '0 0 0px rgba(0,0,0,0)');
        $(id).css('box-shadow', '0 0 0px rgba(0,0,0,0)');
    }, time);
}

/**
 * update the progress bar at the top of the screen
 * @param {number} inc amount to increment when updating, default 0
 */
function update_progress_bar(inc=0) {

    var time_complete = parseFloat(sessionStorage.getItem('time_complete') || 0);
    time_complete += inc;
    sessionStorage.setItem('time_complete', time_complete);

    const percent_complete = time_complete / TOTAL_TIME * 100;

    $(".progress-bar").css({
        width: `${percent_complete}%`
    });
}

/**
 * Correctly sizes the progress bar for the number of practice tasks and actual tasks
 */
function size_progress_bar() {

    const instructions = (INSTRUCTIONS_TIME + PRAC_TASK_TIME)/TOTAL_TIME * 100;
    const tasks = 100 - instructions;

    $("#tutorial_label").css("width", `${instructions}%`);
    $("#done_label").css("width", `${tasks}%`);
}

/**
 * create random id
 */
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * get the user's browser type (for bug reports)
 */
function get_browser() {
    navigator.sayswho = (function(){
        var ua= navigator.userAgent, tem, 
        M= ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
        if(/trident/i.test(M[1])){
            tem=  /\brv[ :]+(\d+)/g.exec(ua) || [];
            return 'IE '+(tem[1] || '');
        }
        if(M[1]=== 'Chrome'){
            tem= ua.match(/\b(OPR|Edge)\/(\d+)/);
            if(tem!= null) return tem.slice(1).join(' ').replace('OPR', 'Opera');
        }
        M= M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
        if((tem= ua.match(/version\/(\d+)/i))!= null) M.splice(1, 1, tem[1]);
        return M.join(' ');
    })();

    return navigator.sayswho
}

/**
 * sort the descriptions by their ucb
 */
function sort_descs_bandit_score() {
    return function(a, b) {
        if (a.display_num_attempts == 0) {
            return 1
        } else if (b.display_num_attempts == 0) {
            return -1
        }
    
        function upperConfBound(x) {
            const i = x.bandit_success_score + 1;
            const j = x.bandit_attempts - x.bandit_success_score + 1;
    
            const mean = i / (i + j);
            const variance = i * j / ((i + j) ** 2 * (i + j + 1));
    
            return mean + Math.sqrt(variance);
        }
    
        if (upperConfBound(a) > upperConfBound(b)) {
            return -1
        } else { 
            return 1
        }
    }
}

function show_loader() {
    $("#loader").fadeIn();
}

/**
 * Remove any outliers > Q3+1.5IQR or < Q1-1.5IQR
 * https://stackoverflow.com/a/20811670/5416200
 * @param {Array} someArray 
 * @param {Number} absMax if any value is above this, remove/replace it
 * @param {Number?} replace if not null, then do not remove outliers, but replace with this default value
 */
function filterOutliers(someArray, absMax=null, replace=null) {  

    var values = array_copy(someArray);
    values.sort( function(a, b) {
        return a - b;
    });

    /* Then find a conservative IQR. This is generous because if (values.length / 4) 
     * is not an int, then really you should average the two elements on either 
     * side to find q1.
     */     

    // if less than 4 datapoints, don't bother trying to find outliers
    var filteredValues = array_copy(values);
    if (values.length > 4) {

        var q1 = values[Math.ceil((values.length / 4))];
        // Likewise for q3. 
        var q3 = values[Math.floor((values.length * (3 / 4)))];
        var iqr = q3 - q1;
    
        // Then find min and max values
        var maxValue = q3 + iqr*1.5;
        var minValue = q1 - iqr*1.5;

        if (replace) {
            filteredValues = values.map(x => ((x <= maxValue) && (x >= minValue)) ? x : replace);
        } else {
            // Then filter anything beyond or beneath these values.
            filteredValues = values.filter(function(x) {
                return (x <= maxValue) && (x >= minValue);
            });
        }
    }

    // constant upper bound
    if (absMax != null) {
        if (replace) {
            filteredValues = filteredValues.map(x => (x <= absMax) ? x : replace);
        } else {
            filteredValues = filteredValues.filter(function(x) {
                return x <= absMax;
            });
        }
    }

    // Then return
    return filteredValues;
}

/**
 * Get a weighted average based on general avg from pilot and task time data, with a heavier weight on task times the more data we collect
 * @param {Array} times all the task times collected (in seconds)
 * @param {Number} avg The average time across all tasks in the pilot (either for speaker or builder tasks) (in seconds)
 * @param {boolean} summed if true, then return the summed timing, not the avg
 */
function weight_timing(times, avg, summed=true) {

    let lambda = Math.exp(-times.length/10); // very arbitrary, vals seemed to line up with intuition: https://www.desmos.com/calculator/u78jjqkhfm

    times = filterOutliers(times, 3*avg, null);

    let avgd = lambda * avg + (1 - lambda) * avg_array(times, avg);

    if (summed) {
        return avgd * times.length;
    }
    return avgd;
}

/**
 * Sum all the elements in an array
 * @param {Array} arr the array to sum
 */
function sum_array(arr) {
    return arr.reduce((a, b) => a + b, 0);
}

/**
 * Average all the elements in an array
 * @param {Array} arr the array to average
 */
function avg_array(arr, def=0) {
    if (arr.length == 0) {
        return def;
    }
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function array_copy(arr) {
    return JSON.parse(JSON.stringify(arr));
}

function object_copy(obj) {
    return JSON.parse(JSON.stringify(obj));
}