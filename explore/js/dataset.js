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