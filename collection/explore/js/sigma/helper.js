function create_action_sequence_graph_from_builds(desc, builds) {

    const ACTION_COLOR_MAP = {
        'edit': '#CCC',
        'floodfill': '#FDCA40',
        'copy': '#2176FF',
        'paste': '#33A1FD',
        'copyFromInput': '#eb8b15',
        'resetOutputGrid': '#31393C',
        'resizeOutputGrid': '#b239d6',
        'check': '#CCC'
    };

    let init_state_id = JSON.stringify([[0, 0, 0], [0, 0, 0], [0, 0, 0]]);
    let final_state_id = JSON.stringify(TEST_PAIR.output.grid);

    // initialize with start and end states
    var g = {
        nodes: [
            {
                id: init_state_id,
                x: 0,
                y: 0,
                size: 10,
                color: '#0000ff'
            },
            {
                id: final_state_id,
                x: 1,
                y: 1,
                size: 10,
                type: 'arrow',
                color: '#26A96C'
            }
        ],
        edges: []
    };

    // draw graph for description verification attempts
    let desc_as = desc.action_sequence;
    if (desc_as) {
        desc_as = JSON.parse(desc_as);

        var direction = Math.random() * Math.PI/2;
        let dx = Math.cos(direction);
        let dy = Math.sin(direction);

        let magnitude = 1 / desc_as.length;
        let last_node_id = init_state_id;

        let visited_nodes = [];

        $.each(desc_as, (i, action) => {
                
            // add resulting grid node if does not exist
            let node_id = JSON.stringify(action.grid);
            let existing_node = g.nodes.find(node => node.id == node_id);

            if (existing_node == null) {
                g.nodes.push({
                    id: node_id,
                    x: dx*magnitude*(i+1)+Math.random()/100,
                    y: dy*magnitude*(i+1)+Math.random()/100,
                    size: 1,
                    color: '#666',
                });
            } else {
                // only increase size if not final or start state, size is < 4, and has not been visited by this user yet
                if (existing_node.id != final_state_id && existing_node.id != init_state_id && existing_node.size <= 4 && !visited_nodes.includes(node_id)) {
                    console.log(visited_nodes);
                    existing_node.size += 1;
                }
            }

            // make red if checked incorrectly
            if (action.action.correct == false && existing_node.id != init_state_id ) {
                console.log("Changing color!");
                existing_node.color = '#FF595E';
            }

            // add edge from previous state to current
            let edge_id = last_node_id + "_" + node_id;
            let exisiting_edge = g.edges.find(edge => edge.id == edge_id);
            let edge_color = ACTION_COLOR_MAP[action.action.tool];
            if (exisiting_edge == null) {
                g.edges.push({
                    id: edge_id,
                    source: last_node_id,
                    target: node_id,
                    type: 'arrow',
                    size: 1,
                    color: edge_color
                });
            } else {
                if (!visited_nodes.includes(node_id)) {
                    exisiting_edge.size += 1;
                }
            }

            visited_nodes.push(node_id);
            last_node_id = node_id;
        });
    }

    // draw graph for builder attempts
    $.each(builds, (_, build) => {

        let action_sequence = build.action_sequence;
        visited_nodes = [];

        if (action_sequence) {
            action_sequence = JSON.parse(action_sequence);

            let direction = Math.random() * Math.PI/2;
            let dx = Math.cos(direction);
            let dy = Math.sin(direction);
            let magnitude = 1 / action_sequence.length;

            let last_node_id = init_state_id;
            $.each(action_sequence, (i, action) => {
                
                // add resulting grid node if does not exist
                let node_id = JSON.stringify(action.grid);
                let existing_node = g.nodes.find(node => node.id == node_id);

                if (existing_node == null) {
                    g.nodes.push({
                        id: node_id,
                        x: dx*magnitude*(i+1)+Math.random()/100,
                        y: dy*magnitude*(i+1)+Math.random()/100,
                        size: 1,
                        color: '#666',
                    });
                } else {
                    // only increase size if not final or start state, size is < 4, and has not been visited by this user yet
                    if (existing_node.id != final_state_id && existing_node.size <= 4 && !visited_nodes.includes(node_id)) {
                        existing_node.size += 1;
                    }
                }

                            // make red if checked incorrectly
            if (action.action.correct == false && existing_node.id != init_state_id) {
                console.log("Changing color!");
                existing_node.color = '#FF595E';
            }

                // add edge from previous state to current
                let edge_id = last_node_id + "_" + node_id;
                let exisiting_edge = g.edges.find(edge => edge.id == edge_id);
                let edge_color = ACTION_COLOR_MAP[action.action.tool];
                if (exisiting_edge == null) {
                    g.edges.push({
                        id: edge_id,
                        source: last_node_id,
                        target: node_id,
                        size: 1,
                        color: edge_color,
                        type: 'arrow',
                    });
                } else {
                    // only increase thickness if new user
                    if (!visited_nodes.includes(node_id)) {
                        exisiting_edge.size += 1;
                    }
                }

                visited_nodes.push(node_id);
                last_node_id = node_id;
            });
        }
    });

    return g;
}