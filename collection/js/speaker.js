var GOOD_WORDS = [];
var PAST_DESCS = [];

$(window).on('load', function () {
    
    // get date to check they are trying before giving up
    START_DATE = new Date();

    // get progress bar completion
    size_progress_bar();
    update_progress_bar();

    // fill textbox forms with actual text
    $("#grid_size_desc").val(GRID_SIZE_PREFIX);
    $("#what_you_see").val(SHOULD_SEE_PREFIX);
    $("#what_you_do").val(HAVE_TO_PREFIX);
    $('.descriptions').highlightWithinTextarea('update');

    // show initial instructions
    if (sessionStorage.getItem('done_speaker_task') == 'true') {
        $('#minimalInstructionsModal').modal('show');
    } else {
        $('#instructionsModal').modal('show');
    }

    // initialize correct database
    const study_name = sessionStorage.getItem('study') || 'dev';
    let study = STUDY_BATCHES[study_name];
    TASKS = study.tasks;
    update_fb_config(study.config, study.name);
    console.log("Initialized " + study.name + " database");

    // get task
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const task = urlParams.get('task') || TASKS[Math.floor(Math.random()*TASKS.length)].toString();  // if none provided, give random task (will never happen to Turker)

    // load task and get descriptions
    DESCRIPTIONS_TYPE = sessionStorage.getItem('type') || "nl";
    loadTask(task);
    get_task_descriptions(task, DESCRIPTIONS_TYPE).then(function (descriptions) {

        descriptions = descriptions.filter(desc => (desc.succeeded_verification != false));
        descriptions.sort(sort_descs_bandit_score());
        PAST_DESCS = descriptions;

        createExampleDescsPager();
        showDescEx(0);

        // if no descriptions, do not tell them about the anatomy of descriptions
        if (descriptions.length == 0) {
            for (i=0;i<TUT_LIST.length;i++) {
                if (TUT_LIST[i][0].includes("At the bottom of each description")) {
                    TUT_LIST.splice(i, 1);
                }
            }
        }
    }).catch(error => {
        errorMsg("Failed to load past task descriptions. Please ensure your internet connection, and retry. If the issue persists, please email samacqua@mit.edu");
    });

    // customize tutorial to fit description type
    if (DESCRIPTIONS_TYPE == "nl") {
        $("#select_ex_io").remove();
    } else if (DESCRIPTIONS_TYPE == "nl_ex") {
        for (i=0;i<TUT_LIST.length;i++) {
            if (TUT_LIST[i][0].includes("describe what you need to do to create the correct output")) {
                TUT_LIST.splice(i+1, 0, ["Then, select one input output example to go along with your description.", ["select_ex_io"], 40, 5, 35]);
            }
        }
    } else if (DESCRIPTIONS_TYPE == "ex") {
        console.error("Description type for speaker task should be natural language or natural language+example, not just example.");
    }

    // get words that have already been used and their word vecs
    get_words().then(words => {
        // get word vecs from db and cache them
        for (i=0;i<words.length;i++) {
            let word = words[i];

            // must be non-empty strings and can't contain ".", "#", "$", "[", or "]"
            if (word.match(/^[0-9a-z]+$/)) {
                GOOD_WORDS.push(word.toLowerCase());
                get_word_vec_cache(word);
            }
        }
    }).catch(error => {
        console.error(error);
        errorMsg("Could not load words that can been used. Please check your internet connection and reload the page. If the issue persists, please email samacqua@mit.edu");
    });
});

// set listeners
$(document).ready(function () {

    // make sure prefix does not change
    $('.descriptions').on("input", function() {
        var value = $(this).val();
        const prefix_mapping = { 'grid_size_desc': GRID_SIZE_PREFIX, 'what_you_see': SHOULD_SEE_PREFIX, 'what_you_do': HAVE_TO_PREFIX }
        const id = $(this).attr("id");
        var prefix = prefix_mapping[id];
        $(this).val(prefix + value.substring(prefix.length));
    });

    // when textarea changes
    $('.descriptions').on("keyup", function () {

        var value = $(this).val();
        const id = $(this).attr("id");

        // get all unique words to replace
        var words_to_replace = value.match(get_bad_words()) || [];
        words_to_replace = [...new Set(words_to_replace)];

        var items = [];
        $.each(words_to_replace, function (i, word) {

            // create the html for the list items
            items.push(
                `<li><b>${word}</b>
                <span class="dropdown">
                <button class="btn btn-secondary dropdown-toggle" type="button" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                    Replace with...
                </button>
                <div class="dropdown-menu" aria-labelledby="dropdownMenuButton" id=${word}_${i}_dropdown>
                </div>
                <button type="button" onclick="confirm_add_word(\'${word}\')" id="add_word_${word}" class="btn btn-danger add-word">add word</button></li>
                </span>`);
        });

        $('#word-warning-' + id).html(items.join(''));

        get_replacement_words(words_to_replace).then(replacements => {

            // // if by the time retrieved words, there are new words, then recall self
            // var present_bad_words = $(this).val().match(get_bad_words()) || [];
            // present_bad_words = [...new Set(words_to_replace)];
            // if (!arraysEqual(present_bad_words, words_to_replace)) {
            //     $(".descriptions").keyup();
            //     return;
            // }

            // add replacements to each list item
            if (words_to_replace.length > 0) {
                replacements.forEach(function(replacement_i, i) {

                    const word = replacement_i[0];
                    const replacement_words = replacement_i[1].map(function(item) { return item[1] });

                    if($(`#${word}_${i}_dropdown`).length != 0) {
                        $(`#${word}_${i}_dropdown`).empty();
                        $(`#${word}_${i}_dropdown`).append(
                            `${(function () {
                                var html_text = "";
                                for (i = 0; i < replacement_words.length; i++) {
                                    const replacement = replacement_words[i];
                                    const dropdown_item = `<a onclick="replace_word(\'${word}\',\'${replacement}\', '#${id}')" id="replace_${word}_${replacement}" class="dropdown-item" href="#">${replacement}</a>`;
                                    html_text += dropdown_item;
                                }
                                return html_text
                            })()}`
                        );
                    }
                });
            }
        });
    });

    // highlight the textareas for words that have not been used yet
    $('.descriptions').highlightWithinTextarea({
        highlight: [
            {
                highlight: get_bad_words
            },
            {
                highlight: [GRID_SIZE_PREFIX, HAVE_TO_PREFIX, SHOULD_SEE_PREFIX],
                className: 'prefixes'
            }
        ]
    });

    //  Make it so modal with sliders has labels of slider values
    $("#conf_result").html($("#conf_form").val());
    $("#conf_form").change(function () {
        $("#conf_result").html($(this).val());
    });
});

// get the max amount of time doing nothing (to nearest 5 seconds)
var idleTime = 0;
var maxIdleTime = 0;
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

// ==============
// Tutorial
// ==============

var TUT_LIST = [
    ["You will now be walked through the layout. Click any of the un-highlighted area to continue.", [], 30, 20, 20],
    ["This is the examples area. As you can see, there are multiple input-output examples. There is a single pattern that changes each input grid to its respective output grid.", ["io_ex_col"], 30, 35, 10],
    ["This is the old descriptions area. Any past attempts to describe the pattern will be shown here.", ["description_ex_col"], 30, 5, 65],
    ["At the bottom of each description, you will see how well people did using the description. So, if the description did pretty well, you may want to only slightly change it. But, if it did poorly, you should rewrite the entire description.", ["desc_success"], 30, 5, 65],
    ["This is the description area. This is where you will describe the pattern you recognized in the examples area. You will break your description into 3 sections:", ["description_col"], 30, 10, 35],
    ["First, describe what you should expect to see in the input.", ["see_desc_form"], 40, 10, 35],
    ["Then, describe how the grid size changes. If it does not change, then make a note of that.", ["grid_size_form"], 40, 10, 35],
    ["Then, describe what you need to do to create the correct output. Keep in mind that the person using your description will see a different input grid than you are seeing.", ["do_desc_form"], 40, 5, 35],
    ["If you use a word in your description that has not been used, it will be <mark id='red_highlight'>highlighted red.</mark> To submit your description, you must replace every red word, or manually add it.", ["description_col"], 40, 5, 35],
    ["If you realize you do not know the pattern, or you cannot describe the pattern, you can give up. If you give up, you will be given a new task to solve instead.", ["give_up_btn"], 40, 5, 35],
    ["Once you are happy with your description, press the Submit button.", ["submit_btn"], 40, 5, 35],
];

var CUR_HIGHLIGHT = null;

$(function () {
    $("#tut-layer").click(function () {
        continue_tutorial();
    });
});

function continue_tutorial() {

    // if last one, then get rid of dark layer
    if (TUT_LIST.length == 0) {
        $("#trans-layer").css('z-index', -1);
        $("#dark-layer").css('z-index', -1);
        $("#dark-layer").css('background-color', 'white');
        $("#tut-message").css('z-index', -2);
        $("#tut-continue-message").css('z-index', -2);
        $("#tut-continue-message").css('background', 'rgba(0,0,0,0.0)');

        scroll_highlight_objective();
        
        return;
    }

    const next_item = TUT_LIST.shift();

    if (arraysEqual(next_item[1], ["grid_size_form"])) {
        $("#grid_size_form").css("visibility", "visible");
    }


    // set last item to be behind dark layer
    if (CUR_HIGHLIGHT != null) {
        for (i = 0; i < CUR_HIGHLIGHT.length; i++) {
            $(`#${CUR_HIGHLIGHT[i]}`).css('position', 'static');
            $(`#${CUR_HIGHLIGHT[i]}`).css('z-index', 'auto');
        }
    }

    // set dark layer and message
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
    for (i = 0; i < next_item[1].length; i++) {
        const id = next_item[1][i];
        $(`#${id}`).css('position', 'relative');
        $(`#${id}`).css('z-index', '501');
        if (id != "objective-col") {
            $(`#${id}`).css('background-color', 'gainsboro');
        }
    }

    // scroll to highlighted element
    if (next_item[1].length > 0) {
        $([document.documentElement, document.body]).animate({
            scrollTop: $('#' + next_item[1][0]).offset().top-10
        }, 1000);
    }

    CUR_HIGHLIGHT = next_item[1];
}

// ==============
// Past Descriptions
// ==============

var CURRENT_DESC = 0;

/**
 * create a pager for all past descriptions
 * @param {int} cur_ex the index of the description to show/highlight
 */
function createExampleDescsPager(cur_ex=0) {

    if (PAST_DESCS.length >= 1) {
        $("#paginator").empty();
        $("#paginator").append(`<li class="page-item"><a class="page-link" href="#" onclick="showDescEx(${Math.max(CURRENT_DESC - 1, 0)}); createExampleDescsPager(${Math.max(CURRENT_DESC-1, 0)});">Previous</a></li>`);

        if (PAST_DESCS.length <= 4) {
            for (i = 0; i < PAST_DESCS.length; i++) {
                if (i == cur_ex) {
                    $("#paginator").append(`<li class="page-item active"><a class="page-link" href="#" onclick="showDescEx(${i});createExampleDescsPager(${i});">${i + 1}</a></li>`);
                } else {
                    $("#paginator").append(`<li class="page-item"><a class="page-link" href="#" onclick="showDescEx(${i});createExampleDescsPager(${i});">${i + 1}</a></li>`);
                }
            }
        } else {
            if (cur_ex != 0) {
                $("#paginator").append(`<li class="page-item"><a class="page-link" href="#" onclick="showDescEx(0);createExampleDescsPager(0);">1</a></li>`);
                $("#paginator").append(`<li class="page-item disabled"><a class="page-link">...</a></li>`);
            }
            $("#paginator").append(`<li class="page-item active"><a class="page-link" href="#" onclick="showDescEx(${cur_ex});createExampleDescsPager(${cur_ex});">${cur_ex + 1}</a></li>`);
            if (cur_ex != PAST_DESCS.length - 1) {
                $("#paginator").append(`<li class="page-item disabled"><a class="page-link">...</a></li>`);
                $("#paginator").append(`<li class="page-item"><a class="page-link" href="#" onclick="showDescEx(${PAST_DESCS.length-1});createExampleDescsPager(${PAST_DESCS.length-1});">${PAST_DESCS.length}</a></li>`);
            }
        }
        $("#paginator").append(`<li class="page-item"><a class="page-link" href="#" onclick="showDescEx(${Math.min(CURRENT_DESC + 1, PAST_DESCS.length - 1)}); createExampleDescsPager(${Math.min(CURRENT_DESC+1, PAST_DESCS.length - 1)}); ">Next</a></li>`);
    }
}

/**
 * in the pager, show/highlight a description
 * @param {int} i the index of the description to show
 */
function showDescEx(i) {
    if (PAST_DESCS.length == 0) {
        $("#ex_size_desc").text("There are no descriptions for this task yet.");
        return;
    }
    CURRENT_DESC = i;
    $("#ex_size_desc").text(PAST_DESCS[i]['grid_desc']);
    $("#ex_see_desc").text(PAST_DESCS[i]['see_desc']);
    $("#ex_do_desc").text(PAST_DESCS[i]['do_desc']);
    $("#desc_success").html(`<b>${PAST_DESCS[i]['display_num_success']}</b> out of <b>${PAST_DESCS[i]['display_num_attempts']}</b> people successfully solved the task using this description.`);
}

// ==============
// Highlight unused words
// ==============

// returns the regex for words that have not been used yet
function get_bad_words(input) {
    return new RegExp('\\b(?!(' + GOOD_WORDS.join("|") + ')\\b)[a-zA-Z]+', 'gmi')
}

// add common permutations of word
function prefix_suffix_permutations(word) {
    let permutations = [];

    if (word == "s") {  // if we add "", then nothing will match regex
        return []
    }

    if (word.slice(-1) == "s") {
        permutations.push(word.slice(0,-1));
    } else {
        permutations.push(word + "s");
    }

    return permutations;
}

// if the word has already been fetched, then returns its vec
// otherwise, fetches from database
var CACHED_W2V = {};
function get_word_vec_cache(word) {
    return new Promise(function (resolve, reject) {
        if (word in CACHED_W2V) {
            return resolve(CACHED_W2V[word]);
        } else {
            get_word_vec(word).then(vec => {
                CACHED_W2V[word] = vec;
                return resolve(vec);
            });
        }
    });
}

/**
 * sort from least to greatest
 * @param {item} a comes before b
 * @param {item} b comes after a
 */
function compare(a, b) {
    if (a[0] > b[0]) return 1;
    if (b[0] > a[0]) return -1;
  
    return 0;
}

// get the closest n words (n=limit) that are in GOOD_WORDS
function get_closest_words(word, limit=10) {
    var dists = [];

    return new Promise(function (resolve, reject) {
        // get word vec of first word
        get_word_vec_cache(word).then(vec1 => {

            // get word vec for every word in GOOD_WORDS
            for (i=0;i<GOOD_WORDS.length;i++) {

                const comp_word = GOOD_WORDS[i];

                if (comp_word in CACHED_W2V) {
                    const vec2 = CACHED_W2V[comp_word];

                    if (vec1 == null || vec2 == null) {
                        dists.push([100, comp_word]);
                    } else {
                        const dist = get_dist(vec1, vec2);
                        dists.push([dist, comp_word]);
                    }
                // shouldn't happen because word2vecs fetched at the beginning
                // but fetching just in case (bc not async for loop, will only help next update)
                } else {
                    get_word_vec(comp_word).then(vec => {
                        CACHED_W2V[comp_word] = vec;
                        
                        if (vec1 == null || vec == null) {
                            dists.push([100, comp_word]);
                        } else {
                            const dist = get_dist(vec1, vec);
                            dists.push([dist, comp_word]);
                        }
                    });
                }
            }
            var closest = dists.sort(compare).slice(0,limit);
            return resolve(closest);
        });
    });
}

// for each word that has not been used, returns that word and its closest meaning words that have been used in past descriptions
function get_replacement_words(words, limit=10) {

    return new Promise(function (resolve, reject) {
        if (words == null) {
            return resolve([])
        }

        const replace_words = [];

        (async function loop2() {
            for (ii = 0; ii <= words.length; ii++) {
                await new Promise(function (res2, rej) {

                    if (ii == words.length) {
                        return resolve(replace_words);
                    }

                    const word = words[ii].toLowerCase();
                    get_closest_words(word, limit).then(closest => {
                        replace_words.push([words[ii], closest]);
                        res2();
                    });
                });
            }
        })();
    });
}

// replace a word in the textarea with another word
function replace_word(word, replacement, text_area_id) {

    const cur_text = $(text_area_id).val();
    var re = new RegExp("\\b" + word + "\\b", "g");
    const replaced_text = cur_text.replace(re, replacement);
    $(text_area_id).val(replaced_text);

    // so that functions called on textarea changes are called, and so highlights resize
    $(text_area_id).trigger('keyup');
    $(text_area_id).highlightWithinTextarea('update');
}

var CUR_WORD_CANDIDATE;

// makes the word okay to use
function confirm_add_word(word) {

    CUR_WORD_CANDIDATE = word;

    $("#word_modal_text").text(word);
    $("#addWordModal").modal('show');
}

// makes the word okay to use
function add_current_candidate_word() {

    GOOD_WORDS.push(CUR_WORD_CANDIDATE);

    let blank_index = GOOD_WORDS.indexOf("");   // ensure not adding ""
    if (blank_index != -1) {
        GOOD_WORDS.splice(GOOD_WORDS.indexOf(""), 1);    // remove "" from list if it exists
    }

    // so that functions called on textarea changes are called, and so highlights resize
    $(".descriptions").trigger('keyup');
    $(".descriptions").highlightWithinTextarea('update');
}

// ==============
// Other Page Logic
// ==============

function submit() {
    /**
     * If starting with right phrase, actually entered text, and has used all known words or added the unknown words, then continue
     */

    if ($("#grid_size_desc").val().trim().length - GRID_SIZE_PREFIX.length < 5) {
        errorMsg("Please enter a description of how the grid size changes. Your description is either empty or too short.");
        return;
    }
    if ($("#what_you_see").val().trim().length - SHOULD_SEE_PREFIX.length < 5) {
        errorMsg("Please enter a description of what you see. Your description is either empty or too short.");
        return;
    }
    if ($("#what_you_do").val().trim().length - HAVE_TO_PREFIX.length < 5) {
        errorMsg("Please enter a description of what you change. Your description is either empty or too short.");
        return;
    }
    if (!$("#what_you_see").val().trim().startsWith(SHOULD_SEE_PREFIX)) {
        errorMsg(`What you see has to start with "${SHOULD_SEE_PREFIX}"`);
        return;
    }
    if (!$("#what_you_do").val().trim().startsWith(HAVE_TO_PREFIX)) {
        errorMsg(`What you do has to start with "${HAVE_TO_PREFIX}"`);
        return;
    }
    if (!$("#grid_size_desc").val().trim().startsWith(GRID_SIZE_PREFIX)) {
        errorMsg(`The grid size field has to start with "${GRID_SIZE_PREFIX}"`);
        return;
    }

    if ($('#word-warning-grid_size_desc').children().length + $('#word-warning-what_you_see').children().length + $('#word-warning-what_you_do').children().length != 0) {
        errorMsg("You must get rid of all red-highlighted words. If they are absolutely necessary for your description, add that word.");
        return;
    }

    verify();
}

function verify() {
    /**
     * store submitted values and go to next task
     */

    show_loader();

    // get entered values
    const see_desc = $.trim($("#what_you_see").val());
    const do_desc = $.trim($("#what_you_do").val());
    var grid_size_desc = $.trim($("#grid_size_desc").val());
    var selected_example = -1;
    if (DESCRIPTIONS_TYPE.includes("ex")) {
        selected_example = parseInt($.trim($("#selectExampleIO").val()) - 1);
    }

    infoMsg("Bringing you to verification...")

    const newTime = new Date();
    const totalTime = (newTime - START_DATE) / 1000;

    // Bring the user to the listener page and show them their own description to ensure they wrote something decent
    window.location.href = `listener.html?task=${TASK_ID}&time=${totalTime}&see=${see_desc}&do=${do_desc}&grid=${grid_size_desc}&se=${selected_example}&ver=true&maxIdle=${maxIdleTime}`;
}

function give_up() {
    /**
     * if after 30 seconds, cannot figure out pattern or get correct output, give them the answer
     */

    const newTime = new Date();
    if ((newTime - START_DATE) / 1000 < 30) {
        errorMsg("Please try to figure out the pattern for at least thirty seconds before you give up.");
        return;
    }

    show_loader();

    // give only partial credit if skip task
    give_up_description(TASK_ID, DESCRIPTIONS_TYPE).then(function () {
        set_user_complete_time(sessionStorage.getItem("uid"), (newTime - START_DATE) / 1000, `${TASK_ID}_${DESCRIPTIONS_TYPE}_speaker_(veto)`).then(function() {
            var tasks_done = (sessionStorage.getItem('tasks_completed') || "").split(',');
            tasks_done.push(TASK_ID);
            sessionStorage.setItem('tasks_completed', tasks_done);
    
            next_task(SPEAKER_TIME*SKIP_PART_CRED);
        });
    });
}