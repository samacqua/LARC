var DESCRIPTIONS_TYPE = "nl";  // the type of descriptions ("nl", "ex", or "nl_ex")
var START_DATE;

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

function array_copy(arr) {
    return JSON.parse(JSON.stringify(arr));
}

function object_copy(obj) {
    return JSON.parse(JSON.stringify(obj));
}