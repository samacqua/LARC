var db, database;

function update_fb_config(config, name) {
    console.log(name);
    try {
        firebase.initializeApp(config, name);
    } catch (err) {
        if (!err.message.includes('already exists')) {
            console.err(err.message);
        }
    }
    db = firebase.app(name).firestore();
    database = firebase.app(name).database();
}

// ===================================
// Retrieve
// ===================================

/**
 * Returns the task and desc_id of an unused description that the user has not already done the task of, if any (otherwise return -1)
 * @param {string} type the type of descriptions ("nl", "ex", or "nl_ex")
 */
function get_unused_desc(type) {
    return new Promise(function (resolve, reject) {
        const unused_ref = db.collection(type + "_unused_descs");

        unused_ref.get().then(querySnapshot => {
            console.log(`read ${querySnapshot.size} documents`);

            shuffle(querySnapshot);

            (async function loop() {
                for (i = 0; i <= querySnapshot.size; i++) {
                    await new Promise(function (res, reject) {

                        if (i == querySnapshot.size) {
                            return resolve(-1);
                        }
                        const desc = querySnapshot.docs[i].id;
                        const task = querySnapshot.docs[i].data().task;

                        const tasks_done = (sessionStorage.getItem('tasks_completed') || "").split(',');
                        if (tasks_done.includes(task)) {
                            console.log("Already interacted with task:", task, ", so will find another task.");
                            res();
                        } else {
                            claim_unused_desc(desc, type).then(function () {
                                return resolve([task, desc]);
                            }).catch(error => {
                                // throws an error if already claimed, so continue to next
                                console.error(error);
                                res();
                            });
                        }
                    });
                }
            })();
        }).catch(error => {
            return reject(error);
        })
    });
}

/**
 * Get count of interactions and descriptions for all tasks.
 * @param {string} type the type of descriptions ("nl", "ex", or "nl_ex")
 */
function get_all_descriptions_interactions_count(type) {
    return new Promise(function (resolve, reject) {
        const summary_ref = db.collection(type + "_tasks").doc("summary");

        summary_ref.get().then(function (snapshot) {
            console.log(`read 1 document`);

            const data = snapshot.data()
            var interactions_count = [];
            var descriptions_count = [];
            var ret_data = {};

            for (i = 0; i < 400; i++) {

                // if study has task
                if (data[`${i}_interactions_count`] != null) {
                    ret_data[i] = {};
                    ret_data[i]['interactions'] = data[`${i}_interactions_count`];
                    ret_data[i]['descriptions'] = data[`${i}_descriptions_count`]
                }
            }
            console.log(ret_data);
            return resolve(ret_data);
        })
            .catch(function (err) {
                return reject(err);
            });
    });
}

/**
 * Get the number of successful and total communications for the best description for the given task
 * @param {number} task the task to get the best description for
 * @param {string} type the type of descriptions ("nl", "ex", or "nl_ex")
 * @return {Promise} a list of lists: [[best desc success score], [best desc total attempts]]
 */
function get_task_best_desc(task, type) {
    return new Promise(function (resolve, reject) {
        const summary_ref = db.collection(type + "_tasks").doc("summary");

        summary_ref.get().then(function (snapshot) {
            console.log(`read 1 documents`);
            const data = snapshot.data();
            return resolve({id: data[`${task}_best_id`], success_score: data[`${task}_best_success_score`] || 0, attempts: data[`${task}_best_total_attempts`] || 0});
        })
        .catch(function (err) {
            return reject(err);
        });
    });
}

/**
 * Get the number of successful and total communications for the best description for each task
 * @param {string} type the type of descriptions ("nl", "ex", or "nl_ex")
 * @return {Promise} a list of lists: [[best desc success score], [best desc total attempts]]
 */
function get_all_tasks_best_desc(type) {
    return new Promise(function (resolve, reject) {
        const summary_ref = db.collection(type + "_tasks").doc("summary");

        summary_ref.get().then(function (snapshot) {

            console.log(`read 1 documents`);

            const data = snapshot.data()
            var best_desc_success_score = [];
            var best_desc_total_attempts = [];

            for (i = 0; i < TASKS.length; i++) {
                const ii = TASKS[i];
                best_desc_success_score.push(data[`${ii}_best_success_score`] || 0);
                best_desc_total_attempts.push(data[`${ii}_best_total_attempts`] || 0);
            }

            return resolve([best_desc_success_score, best_desc_total_attempts]);
        })
            .catch(function (err) {
                return reject(err);
            });
    });
}

/**
 * Get the number of descriptions and total number of interactions for a task
 * @param {number} task the task to get all the interaction counts for
 * @param {string} type the type of descriptions ("nl", "ex", or "nl_ex")
 */
function get_task_descs_interactions_count(task, type) {
    return new Promise(function (resolve, reject) {
        const task_ref = db.collection(type + "_tasks").doc(`${task}`);

        task_ref.get().then(function (snapshot) {
            console.log(`read 1 documents`);
            const data = snapshot.data()
            return resolve([data.num_descriptions, data.num_interactions]);
        })
            .catch(function (err) {
                return reject(err);
            });
    });
}


/**
 * Get all the descriptions for a task
 */
function get_task_descriptions(task_id, type) {

    return new Promise(function (resolve, reject) {
        const task_descs_ref = db.collection(type + "_tasks").doc(`${task_id}`).collection("descriptions");

        task_descs_ref.get().then(function (querySnapshot) {
            console.log(`read ${querySnapshot.size} documents`);

            var descriptions = [];
            querySnapshot.forEach(function (doc) {
                // doc.data() is never undefined for query doc snapshots
                // loop will only run once, just indexing querySnapshot giving issues
                const data = doc.data();
                const description = {
                    'action_sequence': data.action_sequence,
                    'attempts_sequence': data.attempts_sequence,
                    'attempt_jsons': data.attempt_jsons,
                    'bandit_attempts': data.bandit_attempts,
                    'bandit_success_score': data.bandit_success_score,
                    'confidence': data.confidence,
                    'description_time': data.description_time,
                    'display_num_attempts': data.display_num_attempts,
                    'display_num_success': data.display_num_success,
                    'do_desc': data.do_description,
                    'grid_desc': data.grid_description,
                    'max_idle_time': data.max_idle_time,
                    'num_verification_attempts': data.num_verification_attempts,
                    'see_desc': data.see_description,
                    'selected_ex': data.selected_example,
                    'succeeded_verification': data.succeeded_verification,
                    'timestamp': data.timestamp,
                    'uid': data.uid,
                    'verification_time': data.verification_time,
                    'type': type,
                    'task': task_id,
                    'id': doc.id
                };
                descriptions.push(description);
            });
            return resolve(descriptions);
        }).catch(error => {
            return reject(error);
        });
    });
}

/**
 * get a description by it's id and by its task id
 */
function get_description_by_id(task_id, desc_id, type) {
    return new Promise(function (resolve, reject) {
        const desc_ref = db.collection(type + "_tasks").doc(`${task_id}`).collection("descriptions").doc(desc_id);

        desc_ref.get().then(function (snapshot) {
            console.log(`read 1 document`);

            const data = snapshot.data();
            // if does not contain field, just returns undefined, so works for all desc kinds
            const description = {
                'grid_desc': data.grid_description,
                'see_desc': data.see_description,
                'do_desc': data.do_description,
                'selected_ex': data.selected_example,
                'bandit_attempts': data.bandit_attempts,
                'bandit_success_score': data.bandit_success_score,
                'display_num_attempts': data.display_num_attempts,
                'display_num_success': data.display_num_success,
                'timestamp': data.timestamp,
                'description_time': data.description_time,
                'verification_time': data.verification_time,
                'num_verification_attempts': data.num_verification_attempts,
                'succeeded_verification': data.succeed_verification,
                'type': type,
                'task': task_id,
                'uid': data.uid,
                'id': snapshot.id
            };

            return resolve(description);
        }).catch(error => {
            console.error(error);
            return reject(error);
        });
    });
}

/**
 * Get the doc which store's a and b for all descriptions
 * @param {string} type the type of descriptions ("nl", "ex", or "nl_ex")
 */
function get_bandit_doc(type) {
    return new Promise(function (resolve, reject) {
        const summary_ref = db.collection(type + "_tasks").doc("descs_bandit");

        summary_ref.get().then(function (snapshot) {
            console.log(`read 1 document`);
            return resolve(snapshot.data());
        })
        .catch(function (err) {
            return reject(err);
        });
    });
}

/**
 * Get timing doc which store's the times for all descriptions and desc uses
 * @param {string} type the type of descriptions ("nl", "ex", or "nl_ex")
 */
function get_timing_doc(type) {
    return new Promise(function (resolve, reject) {
        const timing_ref = db.collection(type + "_tasks").doc("timing");

        timing_ref.get().then(function (snapshot) {
            console.log(`read 1 document`);
            return resolve(snapshot.data());
        })
        .catch(function (err) {
            return reject(err);
        });
    });
}

/**
 * Get all words that have been used in previous descriptions.
 */
function get_words() {
    return new Promise(function (resolve, reject) {
        const summary_ref = db.collection("total").doc("summary");

        summary_ref.get().then(function (snapshot) {
            console.log(`read 1 document`);
            return resolve(snapshot.data().words)
        })
        .catch(function (err) {
            return reject(err);
        });
    });
}
/**
 * Get word vec for word
 */
function get_word_vec(word) {
    return new Promise(function (resolve, reject) {
        database.ref('word2vec/' + word).once('value').then(function (snapshot) {
            return resolve(snapshot.val());
        });
    });
}

// ===================================
// Store
// ===================================

/**
 * store descriptions, task info and user info and user answers in firebase
 * returns promise so that can transition to next task after storing
 */
function store_description(see_desc, do_desc, grid_desc, task_id, user_id, confidence, attempts, attempt_jsons, action_sequence, desc_time, ver_time, selected_example, type, max_idle_time) {

    return new Promise(function (resolve, reject) {

        var batch = db.batch();
        const task_doc_ref = db.collection(type + "_tasks").doc(task_id.toString());

        const desc_id = uuidv4();

        // set actual info for description in the specific task's collection
        var desc_data = {
            'num_verification_attempts': parseInt(attempts),
            'attempt_jsons': attempt_jsons,
            'action_sequence': action_sequence,
            'succeeded_verification': true,
            'confidence': confidence,

            'uid': user_id,
            'description_time': parseInt(desc_time),
            'verification_time': parseInt(ver_time),
            'timestamp': firebase.firestore.FieldValue.serverTimestamp(),
            'max_idle_time': parseInt(max_idle_time),

            'bandit_attempts': 0,       // # listeners who used description
            'bandit_success_score': 0,  // # listeners who used description successfully, weighted (2 attempts = +0.5, ...)

            'display_num_attempts': 0,  // # listeners who used description (# to be shown to speaker, stored seperately so fake descriptions can show fictional count)
            'display_num_success': 0    // # listeners who used description successfully, unweighted
        }

        if (type == "nl" || type == "nl_ex") {
            desc_data['see_description'] = see_desc;
            desc_data['do_description'] = do_desc;
            desc_data['grid_description'] = grid_desc;
        }
        if (type == "ex" || type == "nl_ex") {
            desc_data['selected_example'] = selected_example;
        }

        const desc_doc_ref = task_doc_ref.collection("descriptions").doc(desc_id);
        batch.set(desc_doc_ref, desc_data);

        // increment num_descriptions
        const increment = firebase.firestore.FieldValue.increment(1);

        var task_update_data = {
            num_descriptions: increment
        };
        batch.update(task_doc_ref, task_update_data);

        // add to words
        const gen_summary_ref = db.collection("total").doc("summary");    // summary for all desc types
        var words = see_desc.match(/\b(\w+)\b/g).concat(do_desc.match(/\b(\w+)\b/g)).concat(grid_desc.match(/\b(\w+)\b/g));
        words = words.map(v => v.toLowerCase());
        batch.update(gen_summary_ref, {
            'words': firebase.firestore.FieldValue.arrayUnion(...words)
        });

        //increment total num descriptions in summary ref
        const summary_ref = db.collection(type + "_tasks").doc("summary");    // summary for just this desc type
        var summary_update_data = {};
        summary_update_data[`${task_id}_descriptions_count`] = increment;
        batch.update(summary_ref, summary_update_data);

        // add description to list of unused descriptions
        const unused_ref = db.collection(type + "_unused_descs").doc(desc_id);
        batch.set(unused_ref, {
            time_claimed: 0,
            task: task_id.toString()
        });

        // add desc a & b to task desc summary document
        const descs_summary_ref = db.collection(type + "_tasks").doc("descs_bandit");
        let bandit_data = {};
        bandit_data[`${task_id}_${desc_id}`] = [0, 0];
        batch.set(descs_summary_ref, bandit_data, {merge: true});

        // set timing in doc
        const timing_ref = db.collection(type + "_tasks").doc("timing");
        let timing_data = {};
        timing_data[`${task_id}_${desc_id}_desc`] = parseInt(desc_time) + parseInt(ver_time);
        batch.set(timing_ref, timing_data, {merge: true});

        batch.commit().then(function () {
            return resolve();
        }).catch(function (err) {
            return reject(err);
        });
    });
}

function store_listener(desc_id, task_id, user_id, attempts, attempt_jsons, action_sequence, total_time, success, type, max_idle_time, best_desc, past_desc, selected_feedback, open_feedback) {
    /**
     * store info for listener task in firebase
     * returns promise so that can transition to next task after storing
     */
    return new Promise(function (resolve, reject) {

        var batch = db.batch();
        const task_doc = db.collection(type + "_tasks").doc(task_id.toString());

        // store attempt use in description doc's attempts collection
        const desc_use_ref = task_doc.collection("descriptions").doc(desc_id).collection("uses").doc();
        let build_data = {
            'num_attempts': attempts,
            'attempt_jsons': attempt_jsons,
            'action_sequence': action_sequence,
            'success': success,
            'timestamp': firebase.firestore.FieldValue.serverTimestamp(),
            'max_idle_time': parseInt(max_idle_time),

            'uid': user_id,
            'time': total_time
        };

        if (!success) {
            build_data['desc_good_faith'] = selected_feedback;
            if (open_feedback != '') {
                build_data['desc_feedback'] = open_feedback;
            }
        }

        batch.set(desc_use_ref, build_data);

        // increment number interactions for task
        const increment = firebase.firestore.FieldValue.increment(1);
        batch.update(task_doc, {
            num_interactions: increment
        });

        // increment the description's number of attempts and success
        const desc_doc = task_doc.collection("descriptions").doc(desc_id);
        var desc_update_data = { 
            bandit_attempts: increment,
            display_num_attempts: increment
        };
        if (success) {
            const success_inc = firebase.firestore.FieldValue.increment(suc_score_addition(attempts));
            desc_update_data['display_num_success'] = increment;
            desc_update_data['bandit_success_score'] = success_inc;
        }
        batch.update(desc_doc, desc_update_data);

        // increment the total number of attempts
        const summary_doc = db.collection(type + "_tasks").doc("summary");
        var summary_data = {};
        summary_data[`${task_id}_interactions_count`] = increment;

        // if desc is now task's best desc, update it in summary doc
        let new_suc_score = past_desc['bandit_success_score'];
        if (success) {
            new_suc_score += suc_score_addition(attempts);
        }
        const new_attempts = past_desc['bandit_attempts'] + 1;

        let a = new_suc_score + PRIORS[0];
        let b = new_attempts - new_suc_score + PRIORS[1];
        let desc_new_mean = a / (a + b);

        if (desc_new_mean >= best_desc.mean || best_desc.id == desc_id) {
            summary_data[`${task_id}_best_success_score`] = new_suc_score;
            summary_data[`${task_id}_best_total_attempts`] = new_attempts;
            summary_data[`${task_id}_best_id`] = desc_id;
        }
        batch.update(summary_doc, summary_data);

        // remove the description from the list of unused descriptions
        const unused_ref = db.collection(type + "_unused_descs").doc(desc_id);
        batch.delete(unused_ref);

        // update a and b in bandit summary
        const descs_summary_ref = db.collection(type + "_tasks").doc("descs_bandit");
        let bandit_data = {};
        bandit_data[`${task_id}_${desc_id}`] = [a-PRIORS[0], b-PRIORS[1]];
        batch.update(descs_summary_ref, bandit_data);

        // add timing
        const timing_ref = db.collection(type + "_tasks").doc("timing");
        let timing_data = {};
        timing_data[`${task_id}_${desc_id}_attempts`] = firebase.firestore.FieldValue.arrayUnion(total_time);
        batch.update(timing_ref, timing_data);

        batch.commit().then(function () {
            return resolve();
        }).catch(function (err) {
            return reject(err);
        });
    });
}

function store_failed_ver_description(see_desc, do_desc, grid_desc, task_id, user_id, confidence, attempts, attempt_jsons, action_sequence, desc_time, ver_time, selected_example, type, max_idle_time) {
    return new Promise(function (resolve, reject) {

        var batch = db.batch();

        const desc_id = uuidv4();
        const task_doc_ref = db.collection(type + "_tasks").doc(task_id.toString());

        // set actual info for description in the specific task's collection
        var desc_data = {
            'num_verification_attempts': parseInt(attempts),
            'attempt_jsons': attempt_jsons,
            'action_sequence': action_sequence,

            'uid': user_id,
            'description_time': parseInt(desc_time),
            'verification_time': parseInt(ver_time),
            'timestamp': firebase.firestore.FieldValue.serverTimestamp(),
            'max_idle_time': parseInt(max_idle_time),

            // store fake stats so that it is never selected by bandit,
            // but can be shown to speaker as an example of a bad dsecription
            'bandit_attempts': 100,
            'bandit_success_score': 0,

            'display_num_attempts': 3,
            'display_num_success': 0
        }

        // record if could not solve verification or if confidence was not high enough
        if (confidence != null) {
            desc_data['confidence'] = confidence;
            desc_data['succeeded_verification'] = true;
        } else {
            desc_data['succeeded_verification'] = false;
        }

        if (type == "nl" || type == "nl_ex") {
            desc_data['see_description'] = see_desc;
            desc_data['do_description'] = do_desc;
            desc_data['grid_description'] = grid_desc;
        }
        if (type == "ex" || type == "nl_ex") {
            desc_data['selected_example'] = selected_example;
        }

        const desc_doc_ref = task_doc_ref.collection("descriptions").doc(desc_id);
        batch.set(desc_doc_ref, desc_data);

        // increment desc_failure_count for task in tasks collection 
        const increment = firebase.firestore.FieldValue.increment(1);
        const task_ref = db.collection(type + "_tasks").doc(task_id.toString());

        var task_update_data = {
            desc_failure_count: increment,
        };
        batch.update(task_ref, task_update_data);

        // set timing in doc
        const timing_ref = db.collection(type + "_tasks").doc("timing");
        let timing_data = {};
        timing_data[`${task_id}_${desc_id}_desc`] = parseInt(desc_time) + parseInt(ver_time);
        batch.set(timing_ref, timing_data, {merge: true});

        batch.commit().then(function () {
            return resolve();
        }).catch(function (err) {
            return reject(err);
        });
    });
}

/**
 * Claim an unused description if it has not been claimed (or if that claim has expired)
 * (a claim ensures that an unused description only forces 1 attempt, and the time is to make sure
 *      there is no issue if someone claims it and never finishes)
 */
function claim_unused_desc(desc_id, type) {
    return new Promise(function (resolve, reject) {
        const desc_ref = db.collection(type + "_unused_descs").doc(desc_id);
        return db.runTransaction(function (transaction) {
            // This code may get re-run multiple times if there are conflicts.
            return transaction.get(desc_ref).then(function (doc) {
                if (!doc.exists) {
                    throw "Trying to claim an unused description that does not exist!";
                }

                const cur_date = Math.floor(Date.now() / 1000);
                const time_to_wait = 60 * 10; // 10 minutes

                if (cur_date - time_to_wait < doc.data().time_claimed) {
                    throw `Description for task ${doc.data().task} has already been claimed!`
                }

                transaction.update(desc_ref, { time_claimed: cur_date });
            });
        }).then(function () {
            console.log("Transaction successfully committed!");
            return resolve();
        }).catch(function (error) {
            return reject(error);
        });
    });
}

/**
 * Store user demographic information
 */
function set_user_demographics(user_id, age, gender) {
    return new Promise(function (resolve, reject) {
        db.collection("users").doc(user_id.toString()).update({
            'age': age,
            'gender': gender,
            'browser': get_browser()
        }).then(function () {
            console.log("successfully set user demographics.");
            return resolve();
        }).catch(function (err) {
            console.error(err);
            return reject(err);
        });
    });
}

/**
 * Store the amount of time it took a user to complete a task for a created user. If the user does not exist, create them
 */
function set_user_complete_time(user_id, time, task_name) {
    return new Promise(function (resolve, reject) {
        var data = {};
        data[task_name] = time;

        db.collection("users").doc(user_id.toString()).set(data, {merge: true})
            .then(function () {
                console.log(`set user time: ${task_name} successfully`);
                return resolve();
            }).catch(function (err) {
                console.error(err);
                return reject(err);
            });
    });
}

function set_user_start_time(user_id) {
    return new Promise(function (resolve, reject) {
        let data = {
            'start_time': firebase.firestore.FieldValue.serverTimestamp()
        };

        db.collection("users").doc(user_id.toString()).set(data, {merge: true})
            .then(function () {
                console.log(`set user start time successfully`);
                return resolve();
            }).catch(function (err) {
                console.error(err);
                return reject(err);
            });
    });
}

/**
 * increment the number of times the user gave up while trying to describe the task
 */
function give_up_description(task_id, type) {

    return new Promise(function (resolve, reject) {

        var batch = db.batch();

        const increment = firebase.firestore.FieldValue.increment(1);
        const task_doc_ref = db.collection(type + "_tasks").doc(task_id.toString());

        batch.update(task_doc_ref, {
            desc_gave_up_count: increment
        });

        // increment 1 minute of effort
        const timing_doc_ref = db.collection(type + "_tasks").doc("timing");
        const time_increment = firebase.firestore.FieldValue.increment(60);
        const key = task_id.toString() + "_veto";
        var timing_data = {};
        timing_data[key] = time_increment;
        batch.update(timing_doc_ref, timing_data);

        batch.commit().then(function () {
            return resolve();
        }).catch(function (err) {
            return reject(err);
        });
    });
}

function store_bug_report() {
    return new Promise(function (resolve, reject) {

        const issue_desc = $("#bug_desc_textarea").val();
        if (issue_desc == '') {
            return resolve();
        }

        db.collection("bug_reports").add({
            'description': issue_desc,
            'email': $("#email-input").val(),
            'timestamp': firebase.firestore.FieldValue.serverTimestamp(),
            'uid': sessionStorage.getItem('uid'),
            'url': window.location.href,
            'browser_type': get_browser()
        }).then(function() {
            console.log("reported bug successfully");
            return resolve();
        }).catch(err => {
            console.log("error reporting bug:", err);
            return reject(err);
        });
    });
}

function store_feedback(description, date, uid) {
    return new Promise(function (resolve, reject) {

        if (description == '') {
            return resolve();
        }

        db.collection("feedback").add({
            'description': description,
            'timestamp': date,
            'uid': uid
        }).then(function() {
            console.log("done");
            return resolve();
        }).catch(err => {
            console.log("error");
            return reject(err);
        });
    });
}


// ===================================
// Initialize
// ===================================

function init_firestore(study) {
    /**
     * Just sets 0 value to all tasks in db. 
     */
    console.log("Starting initialization...");

    update_fb_config(study.config, study.name);
    console.log("Initialized " + study.name + " database");

    var summary_data = {};

    const task_data = {
        'num_descriptions': 0,
        'num_interactions': 0,
        'desc_gave_up_count': 0,    // number of times someone gave up on a description before submitting description
        'desc_failure_count': 0     // number of times someone submitted description, then failed verfication or gave low confidence score (<5)
    }

    let top_1000_words = ['is', 'a', 'ability', 'able', 'about', 'above', 'accept', 'according', 'account', 'across', 'act', 'action', 'activity', 'actually', 'add', 'address', 'administration', 'admit', 'adult', 'affect', 'after', 'again', 'against', 'age', 'agency', 'agent', 'ago', 'agree', 'agreement', 'ahead', 'air', 'all', 'allow', 'almost', 'alone', 'along', 'already', 'also', 'although', 'always', 'American', 'among', 'amount', 'analysis', 'and', 'animal', 'another', 'answer', 'any', 'anyone', 'anything', 'appear', 'apply', 'approach', 'area', 'argue', 'arm', 'around', 'arrive', 'art', 'article', 'artist', 'as', 'ask', 'assume', 'at', 'attack', 'attention', 'attorney', 'audience', 'author', 'authority', 'available', 'avoid', 'away', 'baby', 'back', 'bad', 'bag', 'ball', 'bank', 'bar', 'base', 'be', 'beat', 'beautiful', 'because', 'become', 'bed', 'before', 'begin', 'behavior', 'behind', 'believe', 'benefit', 'best', 'better', 'between', 'beyond', 'big', 'bill', 'billion', 'bit', 'black', 'blood', 'blue', 'board', 'body', 'book', 'born', 'both', 'box', 'boy', 'break', 'bring', 'brother', 'budget', 'build', 'building', 'business', 'but', 'buy', 'by', 'call', 'camera', 'campaign', 'can', 'cancer', 'candidate', 'capital', 'car', 'card', 'care', 'career', 'carry', 'case', 'catch', 'cause', 'cell', 'center', 'central', 'century', 'certain', 'certainly', 'chair', 'challenge', 'chance', 'change', 'character', 'charge', 'check', 'child', 'choice', 'choose', 'church', 'citizen', 'city', 'civil', 'claim', 'class', 'clear', 'clearly', 'close', 'coach', 'cold', 'collection', 'college', 'color', 'come', 'commercial', 'common', 'community', 'company', 'compare', 'computer', 'concern', 'condition', 'conference', 'Congress', 'consider', 'consumer', 'contain', 'continue', 'control', 'cost', 'could', 'country', 'couple', 'course', 'court', 'cover', 'create', 'crime', 'cultural', 'culture', 'cup', 'current', 'customer', 'cut', 'dark', 'data', 'daughter', 'day', 'dead', 'deal', 'death', 'debate', 'decade', 'decide', 'decision', 'deep', 'defense', 'degree', 'Democrat', 'democratic', 'describe', 'design', 'despite', 'detail', 'determine', 'develop', 'development', 'die', 'difference', 'different', 'difficult', 'dinner', 'direction', 'director', 'discover', 'discuss', 'discussion', 'disease', 'do', 'doctor', 'dog', 'door', 'down', 'draw', 'dream', 'drive', 'drop', 'drug', 'during', 'each', 'early', 'east', 'easy', 'eat', 'economic', 'economy', 'edge', 'education', 'effect', 'effort', 'eight', 'either', 'election', 'else', 'employee', 'end', 'energy', 'enjoy', 'enough', 'enter', 'entire', 'environment', 'environmental', 'especially', 'establish', 'even', 'evening', 'event', 'ever', 'every', 'everybody', 'everyone', 'everything', 'evidence', 'exactly', 'example', 'executive', 'exist', 'expect', 'experience', 'expert', 'explain', 'eye', 'face', 'fact', 'factor', 'fail', 'fall', 'family', 'far', 'fast', 'father', 'fear', 'federal', 'feel', 'feeling', 'few', 'field', 'fight', 'figure', 'fill', 'film', 'final', 'finally', 'financial', 'find', 'fine', 'finger', 'finish', 'fire', 'firm', 'first', 'fish', 'five', 'floor', 'fly', 'focus', 'follow', 'food', 'foot', 'for', 'force', 'foreign', 'forget', 'form', 'former', 'forward', 'four', 'free', 'friend', 'from', 'front', 'full', 'fund', 'future', 'game', 'garden', 'gas', 'general', 'generation', 'get', 'girl', 'give', 'glass', 'go', 'goal', 'good', 'government', 'great', 'green', 'ground', 'group', 'grow', 'growth', 'guess', 'gun', 'guy', 'hair', 'half', 'hand', 'hang', 'happen', 'happy', 'hard', 'have', 'he', 'head', 'health', 'hear', 'heart', 'heat', 'heavy', 'help', 'her', 'here', 'herself', 'high', 'him', 'himself', 'his', 'history', 'hit', 'hold', 'home', 'hope', 'hospital', 'hot', 'hotel', 'hour', 'house', 'how', 'however', 'huge', 'human', 'hundred', 'husband', 'I', 'idea', 'identify', 'if', 'image', 'imagine', 'impact', 'important', 'improve', 'in', 'include', 'including', 'increase', 'indeed', 'indicate', 'individual', 'industry', 'information', 'inside', 'instead', 'institution', 'interest', 'interesting', 'international', 'interview', 'into', 'investment', 'involve', 'issue', 'it', 'item', 'its', 'itself', 'job', 'join', 'just', 'keep', 'key', 'kid', 'kill', 'kind', 'kitchen', 'know', 'knowledge', 'land', 'language', 'large', 'last', 'late', 'later', 'laugh', 'law', 'lawyer', 'lay', 'lead', 'leader', 'learn', 'least', 'leave', 'left', 'leg', 'legal', 'less', 'let', 'letter', 'level', 'lie', 'life', 'light', 'like', 'likely', 'line', 'list', 'listen', 'little', 'live', 'local', 'long', 'look', 'lose', 'loss', 'lot', 'love', 'low', 'machine', 'magazine', 'main', 'maintain', 'major', 'majority', 'make', 'man', 'manage', 'management', 'manager', 'many', 'market', 'marriage', 'material', 'matter', 'may', 'maybe', 'me', 'mean', 'measure', 'media', 'medical', 'meet', 'meeting', 'member', 'memory', 'mention', 'message', 'method', 'middle', 'might', 'military', 'million', 'mind', 'minute', 'miss', 'mission', 'model', 'modern', 'moment', 'money', 'month', 'more', 'morning', 'most', 'mother', 'mouth', 'move', 'movement', 'movie', 'Mr', 'Mrs', 'much', 'music', 'must', 'my', 'myself', 'name', 'nation', 'national', 'natural', 'nature', 'near', 'nearly', 'necessary', 'need', 'network', 'never', 'new', 'news', 'newspaper', 'next', 'nice', 'night', 'no', 'none', 'nor', 'north', 'not', 'note', 'nothing', 'notice', 'now', "n't", 'number', 'occur', 'of', 'off', 'offer', 'office', 'officer', 'official', 'often', 'oh', 'oil', 'ok', 'old', 'on', 'once', 'one', 'only', 'onto', 'open', 'operation', 'opportunity', 'option', 'or', 'order', 'organization', 'other', 'others', 'our', 'out', 'outside', 'over', 'own', 'owner', 'page', 'pain', 'painting', 'paper', 'parent', 'part', 'participant', 'particular', 'particularly', 'partner', 'party', 'pass', 'past', 'patient', 'pattern', 'pay', 'peace', 'people', 'per', 'perform', 'performance', 'perhaps', 'period', 'person', 'personal', 'phone', 'physical', 'pick', 'picture', 'piece', 'place', 'plan', 'plant', 'play', 'player', 'PM', 'point', 'police', 'policy', 'political', 'politics', 'poor', 'popular', 'population', 'position', 'positive', 'possible', 'power', 'practice', 'prepare', 'present', 'president', 'pressure', 'pretty', 'prevent', 'price', 'private', 'probably', 'problem', 'process', 'produce', 'product', 'production', 'professional', 'professor', 'program', 'project', 'property', 'protect', 'prove', 'provide', 'public', 'pull', 'purpose', 'push', 'put', 'quality', 'question', 'quickly', 'quite', 'race', 'radio', 'raise', 'range', 'rate', 'rather', 'reach', 'read', 'ready', 'real', 'reality', 'realize', 'really', 'reason', 'receive', 'recent', 'recently', 'recognize', 'record', 'red', 'reduce', 'reflect', 'region', 'relate', 'relationship', 'religious', 'remain', 'remember', 'remove', 'report', 'represent', 'Republican', 'require', 'research', 'resource', 'respond', 'response', 'responsibility', 'rest', 'result', 'return', 'reveal', 'rich', 'right', 'rise', 'risk', 'road', 'rock', 'role', 'room', 'rule', 'run', 'safe', 'same', 'save', 'say', 'scene', 'school', 'science', 'scientist', 'score', 'sea', 'season', 'seat', 'second', 'section', 'security', 'see', 'seek', 'seem', 'sell', 'send', 'senior', 'sense', 'series', 'serious', 'serve', 'service', 'set', 'seven', 'several', 'sex', 'sexual', 'shake', 'share', 'she', 'shoot', 'short', 'shot', 'should', 'shoulder', 'show', 'side', 'sign', 'significant', 'similar', 'simple', 'simply', 'since', 'sing', 'single', 'sister', 'sit', 'site', 'situation', 'six', 'size', 'skill', 'skin', 'small', 'smile', 'so', 'social', 'society', 'soldier', 'some', 'somebody', 'someone', 'something', 'sometimes', 'son', 'song', 'soon', 'sort', 'sound', 'source', 'south', 'southern', 'space', 'speak', 'special', 'specific', 'speech', 'spend', 'sport', 'spring', 'staff', 'stage', 'stand', 'standard', 'star', 'start', 'state', 'statement', 'station', 'stay', 'step', 'still', 'stock', 'stop', 'store', 'story', 'strategy', 'street', 'strong', 'structure', 'student', 'study', 'stuff', 'style', 'subject', 'success', 'successful', 'such', 'suddenly', 'suffer', 'suggest', 'summer', 'support', 'sure', 'surface', 'system', 'table', 'take', 'talk', 'task', 'tax', 'teach', 'teacher', 'team', 'technology', 'television', 'tell', 'ten', 'tend', 'term', 'test', 'than', 'thank', 'that', 'the', 'their', 'them', 'themselves', 'then', 'theory', 'there', 'these', 'they', 'thing', 'think', 'third', 'this', 'those', 'though', 'thought', 'thousand', 'threat', 'three', 'through', 'throughout', 'throw', 'thus', 'time', 'to', 'today', 'together', 'tonight', 'too', 'top', 'total', 'tough', 'toward', 'town', 'trade', 'traditional', 'training', 'travel', 'treat', 'treatment', 'tree', 'trial', 'trip', 'trouble', 'true', 'truth', 'try', 'turn', 'TV', 'two', 'type', 'under', 'understand', 'unit', 'until', 'up', 'upon', 'us', 'use', 'usually', 'value', 'various', 'very', 'victim', 'view', 'violence', 'visit', 'voice', 'vote', 'wait', 'walk', 'wall', 'want', 'war', 'watch', 'water', 'way', 'we', 'weapon', 'wear', 'week', 'weight', 'well', 'west', 'western', 'what', 'whatever', 'when', 'where', 'whether', 'which', 'while', 'white', 'who', 'whole', 'whom', 'whose', 'why', 'wide', 'wife', 'will', 'win', 'wind', 'window', 'wish', 'with', 'within', 'without', 'woman', 'wonder', 'word', 'work', 'worker', 'world', 'worry', 'would', 'write', 'writer', 'wrong', 'yard', 'yeah', 'year', 'yes', 'yet', 'you', 'young', 'your'];
    top_1000_words = top_1000_words.concat(["output", "grid", "size", "input", "should"]);
    
    // make sure the database has no users
    db.collection('users').limit(1).get()
    .then(function(querySnapshot) {
        return new Promise((resolve, reject) => {
            if (querySnapshot.size == 1) {
                return reject('Only initialize empty database');
            } else {
                return resolve();
            }
        });
    }).then(function() {
        return new Promise((resolve, reject) => {
            db.collection('nl_tasks').limit(1).get().then(querySnapshot => {
                if (querySnapshot.size == 1) {
                    return reject('Only initialize empty database');
                } else {
                    return resolve();
                }
            });
        });
    }).then(function() {
        return db.collection('total').doc('summary').set({
            'words': top_1000_words
        });
    }).then(function () {
        console.log("Initialized words in Firestore.")

        // store counts of interactions and descriptions for each description type for bandit algorithm
        // and the success score and the total attempts for the best description for each task
        for (i = 0; i < TASKS.length; i++) {
            const ii = TASKS[i];
            summary_data[`${ii}_interactions_count`] = 0;
            summary_data[`${ii}_descriptions_count`] = 0;
            summary_data[`${ii}_best_success_score`] = 0;
            summary_data[`${ii}_best_total_attempts`] = 0;
            summary_data[`${ii}_best_id`] = "0";
        }

        return db.collection("nl_tasks").doc("summary").set(summary_data);
    }).then(function () {
        console.log("Initialized nl summary in Firestore.");
        return db.collection("nl_ex_tasks").doc("summary").set(summary_data);
    }).then(function () {
        console.log("Initialized nl_ex summary in Firestore.");
        return db.collection("ex_tasks").doc("summary").set(summary_data);
    }).then(function () {
        console.log("Initialized ex summary in Firestore.");

        var batch = db.batch();
        for (task_num = 0; task_num < TASKS.length; task_num++) {
            const ii = TASKS[task_num];
            batch.set(db.collection("nl_tasks").doc(ii.toString()), task_data);
        }
        return batch.commit();

    }).then(function () {
        console.log("Initialized all nl tasks in Firestore.");

        var batch = db.batch();
        for (task_num = 0; task_num < TASKS.length; task_num++) {
            const ii = TASKS[task_num];
            batch.set(db.collection("nl_ex_tasks").doc(ii.toString()), task_data);
        }
        return batch.commit();

    }).then(function () {
        console.log("Initialized all nl_ex tasks in Firestore.");

        var batch = db.batch();
        for (task_num = 0; task_num < TASKS.length; task_num++) {
            const ii = TASKS[task_num];
            batch.set(db.collection("ex_tasks").doc(ii.toString()), task_data);
        }
        return batch.commit();

    }).then(function () {
        console.log("Initialized all ex tasks in Firestore.");
        console.log("Initialized Firestore!");
    }).catch(error => {
        console.error("Error intializing Firestore: ", error);
    });
}

function reformat_desc_action_sequence(new_sequence, desc_id, task, type) {
    return new Promise(function (resolve, reject) {
        db.collection(`${type}_tasks`).doc(task.toString()).collection("descriptions").doc(desc_id).update({
            'action_sequence': JSON.stringify(new_sequence)
        }).then(function () {
            console.log("successfully set new action sequence for description " + desc_id + "of task" + task.toString());
            return resolve();
        }).catch(function (err) {
            console.error(err);
            return reject(err);
        });
    });
}

function reformat_build_action_sequence(new_sequence, build_id, desc_id, task, type) {
    return new Promise(function (resolve, reject) {
        db.collection(`${type}_tasks`).doc(task.toString()).collection("descriptions").doc(desc_id).collection("uses").doc(build_id).update({
            'action_sequence': JSON.stringify(new_sequence)
        }).then(function () {
            console.log("successfully set new action sequence for build " + build_id + " for desc " + desc_id + " of task " + task.toString());
            return resolve();
        }).catch(function (err) {
            console.error(err);
            return reject(err);
        });
    });
}