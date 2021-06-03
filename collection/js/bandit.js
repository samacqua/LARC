/**
 * Returns the casino (task) with the most variance in success of the best description scaled by the effort already put into that casino
 * @param {string} type the type of descriptions ("nl", "ex", or "nl_ex")
 */
function select_casino(type) {
    return new Promise(function (resolve, reject) {
        get_bandit_doc(type).then(bandit_doc => {
            get_timing_doc(type).then(timing => {

                // calculate effort ratios (ratio of time spent on task to total time)
                let all_efforts = parse_timing_doc(timing);
                
                let avg_efforts = sum_array(Object.values(all_efforts));
                let efforts_ratio = {};
                $.each(all_efforts, function(task_id, task_effort_sum) {
                    efforts_ratio[task_id] = (task_effort_sum/avg_efforts);
                });

                // calculate variance (scaled by effort ratio) of best descriptions of each task, ignoring tasks already done
                let cas_scores = {};
                let cas_scores_unweighted = {}; // unused, for dev
                let bandit_arm_vals = {};   // unused, for dev
                let casinos = parse_bandit_doc(bandit_doc);
                const tasks_done = (sessionStorage.getItem('tasks_completed') || "").split(',');

                $.each(casinos, function(task_id, desc_obj) {
                    let task_best_arms = [];

                    $.each(desc_obj, function(desc_id, bandit_vals) {
                        task_best_arms.push(bandit_vals);
                    });

                    // sort by mean and slice so only top half
                    function band_mean(i, j) {
                        return (i + PRIORS[0]) / (i + PRIORS[0] + PRIORS[1] + j);
                    }
                    task_best_arms.sort((c,d) => band_mean(c.a, c.b) < band_mean(d.a, d.b) ? 1 : -1);

                    let half_i = Math.ceil(task_best_arms.length / 2);
                    let best_half = task_best_arms.splice(0, half_i);

                    let super_a = PRIORS[0];
                    let super_b = PRIORS[1];

                    for (i=0;i<best_half.length;i++) {
                        let arm = best_half[i];
                        super_a += arm.a;
                        super_b += arm.b;
                    }

                    let variance = super_a*super_b / ((super_a+super_b)**2 * (super_a+super_b+1));
                    cas_scores_unweighted[task_id] = variance;
                    bandit_arm_vals[task_id] = [super_a, super_b];
                    
                    if (efforts_ratio.hasOwnProperty(task_id)) {
                        variance /= efforts_ratio[task_id];
                    } else {
                        variance = Infinity;
                    }

                    if (tasks_done.includes(task_id)) {
                        variance = -1;
                    }

                    if (super_a - PRIORS[0] > 0 && STOP_AFTER_SUCCESS) {  // if task has a successful communication, ignore it
                        variance = -1;
                    }

                    cas_scores[task_id] = variance;
                });

                // console.log("all efforts:", all_efforts);
                // console.log("effort ratios:", efforts_ratio);
                // console.log("casino scores unweighted by time:", cas_scores_unweighted);
                // console.log("casino bandit vals:", bandit_arm_vals);
                // console.log("casino scores:", cas_scores);

                // var sortable = [];
                // for (var score in cas_scores) {
                //     sortable.push([score, cas_scores[score]]);
                // }
                // sortable.sort(function(a, b) {
                //     return a[1] - b[1];
                // });
                // console.log("sorted casino scores:", sortable);
                // sortable = [];
                // for (var score in cas_scores_unweighted) {
                //     sortable.push([score, cas_scores_unweighted[score]]);
                // }
                // sortable.sort(function(a, b) {
                //     return a[1] - b[1];
                // });
                // console.log("sorted casino scores unweighted by time:", sortable);

                // var sorted_keys = [];
                // $.each(sortable, function(key, value) {
                //     sorted_keys.push(value[0]);
                // });
                // console.log(JSON.stringify(sorted_keys));

                let max = -Infinity;
                let argmax = [];
                // calculate argmax, return random choice if tie to prevent a bunch of users pulling same arm
                $.each(cas_scores, function(key, value) {
                    if (value > max) {
                        max = value;
                        argmax = [key];
                    } else if (value == max) {
                        argmax.push(key);
                    }
                });

                // all tasks have been done by user
                if (max < 0) {
                    console.log("Done (interacted with all available tasks)");
                    return resolve(-1);
                }
                const chosen_arg_max = argmax[Math.floor(Math.random() * argmax.length)];
                return resolve(chosen_arg_max);
            });
        })
        .catch(function (err) {
            return reject(err);
        });
    });
}

/**
 * Takes the firestore timing doc, which has form
 * {task_desc_id_desc: desc_time, task_desc_id_build: [build_time]} for all tasks' descriptions and builds
 * Parses the doc into an object with the sum of all the times for a task (weighted to take into account pilot avg), with outliers for each task removed
 * @param {Object} doc the firestore document for timing
 * @returns {Object} an object of the sum of all the times for a task with no outliers
 */
function parse_timing_doc(doc) {
// noone should spend 15  minutes on a task. TODO: discuss this val
    let all_desc_times = {};
    let all_build_times = {};
    let veto_times = {};

    // organize all times by task and type (speak or build)
    $.each(doc, function(key, value) {
        let split_key = key.split('_');
        let task = split_key[0];

        if (split_key[1] == 'veto') {
            veto_times[task] = value;
        } else if (split_key[2] == 'desc') {
            if (all_desc_times.hasOwnProperty(task)) {
                all_desc_times[task].push(value);
            } else {
                all_desc_times[task] = [value];
            }
        } else {
            for (i=0;i<value.length;i++) {
                if (all_build_times.hasOwnProperty(task)) {
                    all_build_times[task].push(value[i]);
                } else {
                    all_build_times[task] = [value[i]];
                }
            }
        }
    });

    let task_times = {};

    // Filter outliers and sum
    $.each(veto_times, (task, time) => {
        task_times[task] = time;
    });
    $.each(all_desc_times, function(task, times) {

        // filter outliers and anything over double predicted time
        let filtered_times = filterOutliers(times, SPEAKER_TIME*60*2, SPEAKER_TIME*60*2);

        if (task_times.hasOwnProperty(task)) {
            task_times[task] += weight_timing(filtered_times, SPEAKER_TIME*60);
        } else {
            task_times[task] = weight_timing(filtered_times, SPEAKER_TIME*60);
        }
    });
    $.each(all_build_times, function(task, times) {

        // filter outliers and anything over double predicted time
        let filtered_times = filterOutliers(times, BUILDER_TIME*60*2, BUILDER_TIME*60*2);

        if (task_times.hasOwnProperty(task)) {
            task_times[task] += weight_timing(filtered_times, BUILDER_TIME*60);
        } else {
            task_times[task] = weight_timing(filtered_times, BUILDER_TIME*60);
        }
    });

    return task_times;
}

/**
 * parses the firestore bandit doc and returns a casinos object which has a and b values for all descs by task
 * @param {Object} doc the firestore bandit doc
 * @returns {Object} casinos object which has a and b values for all descs by task
 */
function parse_bandit_doc(doc) {
    let casinos = {};

    // loop thru all tasks so that each task has an a and b value
    for (i=0;i<TASKS.length;i++) {
        casinos[TASKS[i]] = {};
    }

    $.each(doc, function(key, value) {
        let task = key.split('_')[0];
        let desc_id = key.split('_')[1];
        let a = value[0];
        let b = value[1];

        if (casinos.hasOwnProperty(task)) {
            casinos[task][desc_id] = {'a': a, 'b': b};
        } else {
            casinos[task] = {};
            casinos[task][desc_id] = {'a': a, 'b': b};
        }
    });
    return casinos;
}

/**
 * Returns the arm (description_id) that should be pulled. If the description_id is -1, that means pull a new arm (create a new description)
 * @param {number} task the task number, as chosen by select_casino()
 * @param {string} type the type of descriptions ("nl", "ex", or "nl_ex")
 */
function select_arm(task, type) {
    return new Promise(function (resolve, reject) {
        get_task_descs_interactions_count(task, type).then(interactions_descriptions => {

            const num_arms = interactions_descriptions[0];
            const num_interactions = interactions_descriptions[1];

            // UCB
            get_task_descriptions(task, type).then(descriptions => {

                var best_mean = 0;
                // calculate successfulness mean of best description
                for (i = 0; i < descriptions.length; i++) {
                    const a = descriptions[i]['bandit_success_score'] + PRIORS[0];
                    const b = descriptions[i]['bandit_attempts'] - descriptions[i]['bandit_success_score'] + PRIORS[1];
                    const mean = a / (a + b);
                    if (mean > best_mean) {
                        best_mean = mean;
                    }
                }

                // check if should sample new arm
                const task_difficulty = (1 - best_mean);
                if (num_arms <= num_interactions ** task_difficulty) {
                    return resolve(-1);
                }

                // calculate UCB and return max
                var ucbs = [];
                for (i = 0; i < descriptions.length; i++) {

                    const a = descriptions[i]['bandit_success_score'] + PRIORS[0];
                    const b = descriptions[i]['bandit_attempts'] - descriptions[i]['bandit_success_score'] + PRIORS[1];

                    const mean = a / (a + b);
                    const variance = (a * b) / ((a + b)**2 * (a + b + 1));

                    ucbs.push(mean + Math.sqrt(variance));
                }
                const argmax = ucbs.indexOf(Math.max.apply(Math, ucbs));
                return resolve(descriptions[argmax]['id']);

            }).catch(error => {
                return reject(error);
            });
        }).catch(error => {
            return reject(error);
        })
    });
}