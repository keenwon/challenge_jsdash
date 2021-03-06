'use strict'; /*jslint node:true*/

function getAstar() {

    function pathTo(node) {
        var curr = node;
        var path = [];
        while (curr.parent) {
            path.unshift(curr);
            curr = curr.parent;
        }
        return path;
    }

    function getHeap() {
        return new BinaryHeap(function (node) {
            return node.f;
        });
    }

    var astar = {
        /**
        * Perform an A* Search on a graph given a start and end node.
        * @param {Graph} graph
        * @param {GridNode} start
        * @param {GridNode} end
        * @param {Object} [options]
        * @param {bool} [options.closest] Specifies whether to return the
                   path to the closest node if the target is unreachable.
        * @param {Function} [options.heuristic] Heuristic function (see
        *          astar.heuristics).
        */
        search: function (graph, start, end, options) {
            graph.cleanDirty();
            options = options || {};
            var heuristic = options.heuristic || astar.heuristics.manhattan;
            var closest = options.closest || false;

            var openHeap = getHeap();
            var closestNode = start; // set the start node to be the closest if required

            start.h = heuristic(start, end);
            graph.markDirty(start);

            openHeap.push(start);

            while (openHeap.size() > 0) {

                // Grab the lowest f(x) to process next.  Heap keeps this sorted for us.
                var currentNode = openHeap.pop();

                // End case -- result has been found, return the traced path.
                if (currentNode === end) {
                    return pathTo(currentNode);
                }

                // Normal case -- move currentNode from open to closed, process each of its neighbors.
                currentNode.closed = true;

                // Find all neighbors for the current node.
                var neighbors = graph.neighbors(currentNode);

                for (var i = 0, il = neighbors.length; i < il; ++i) {
                    var neighbor = neighbors[i];

                    if (neighbor.closed || neighbor.isWall()) {
                        // Not a valid node to process, skip to next neighbor.
                        continue;
                    }

                    // The g score is the shortest distance from start to current node.
                    // We need to check if the path we have arrived at this neighbor is the shortest one we have seen yet.
                    var gScore = currentNode.g + neighbor.getCost(currentNode);
                    var beenVisited = neighbor.visited;

                    if (!beenVisited || gScore < neighbor.g) {

                        // Found an optimal (so far) path to this node.  Take score for node to see how good it is.
                        neighbor.visited = true;
                        neighbor.parent = currentNode;
                        neighbor.h = neighbor.h || heuristic(neighbor, end);
                        neighbor.g = gScore;
                        neighbor.f = neighbor.g + neighbor.h;
                        graph.markDirty(neighbor);
                        if (closest) {
                            // If the neighbour is closer than the current closestNode or if it's equally close but has
                            // a cheaper path than the current closest node then it becomes the closest node
                            if (neighbor.h < closestNode.h || (neighbor.h === closestNode.h && neighbor.g < closestNode.g)) {
                                closestNode = neighbor;
                            }
                        }

                        if (!beenVisited) {
                            // Pushing to heap will put it in proper place based on the 'f' value.
                            openHeap.push(neighbor);
                        } else {
                            // Already seen the node, but since it has been rescored we need to reorder it in the heap
                            openHeap.rescoreElement(neighbor);
                        }
                    }
                }
            }

            if (closest) {
                return pathTo(closestNode);
            }

            // No result was found - empty array signifies failure to find path.
            return [];
        },
        // See list of heuristics: http://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html
        heuristics: {
            manhattan: function (pos0, pos1) {
                var d1 = Math.abs(pos1.x - pos0.x);
                var d2 = Math.abs(pos1.y - pos0.y);
                return d1 + d2;
            },
            diagonal: function (pos0, pos1) {
                var D = 1;
                var D2 = Math.sqrt(2);
                var d1 = Math.abs(pos1.x - pos0.x);
                var d2 = Math.abs(pos1.y - pos0.y);
                return (D * (d1 + d2)) + ((D2 - (2 * D)) * Math.min(d1, d2));
            }
        },
        cleanNode: function (node) {
            node.f = 0;
            node.g = 0;
            node.h = 0;
            node.visited = false;
            node.closed = false;
            node.parent = null;
        }
    };

    /**
     * A graph memory structure
     * @param {Array} gridIn 2D array of input weights
     * @param {Object} [options]
     * @param {bool} [options.diagonal] Specifies whether diagonal moves are allowed
     */
    function Graph(gridIn, options) {
        options = options || {};
        this.nodes = [];
        this.diagonal = !!options.diagonal;
        this.grid = [];
        for (var x = 0; x < gridIn.length; x++) {
            this.grid[x] = [];

            for (var y = 0, row = gridIn[x]; y < row.length; y++) {
                var node = new GridNode(x, y, row[y]);
                this.grid[x][y] = node;
                this.nodes.push(node);
            }
        }
        this.init();
    }

    Graph.prototype.init = function () {
        this.dirtyNodes = [];
        for (var i = 0; i < this.nodes.length; i++) {
            astar.cleanNode(this.nodes[i]);
        }
    };

    Graph.prototype.cleanDirty = function () {
        for (var i = 0; i < this.dirtyNodes.length; i++) {
            astar.cleanNode(this.dirtyNodes[i]);
        }
        this.dirtyNodes = [];
    };

    Graph.prototype.markDirty = function (node) {
        this.dirtyNodes.push(node);
    };

    Graph.prototype.neighbors = function (node) {
        var ret = [];
        var x = node.x;
        var y = node.y;
        var grid = this.grid;

        // West
        if (grid[x - 1] && grid[x - 1][y]) {
            ret.push(grid[x - 1][y]);
        }

        // East
        if (grid[x + 1] && grid[x + 1][y]) {
            ret.push(grid[x + 1][y]);
        }

        // South
        if (grid[x] && grid[x][y - 1]) {
            ret.push(grid[x][y - 1]);
        }

        // North
        if (grid[x] && grid[x][y + 1]) {
            ret.push(grid[x][y + 1]);
        }

        if (this.diagonal) {
            // Southwest
            if (grid[x - 1] && grid[x - 1][y - 1]) {
                ret.push(grid[x - 1][y - 1]);
            }

            // Southeast
            if (grid[x + 1] && grid[x + 1][y - 1]) {
                ret.push(grid[x + 1][y - 1]);
            }

            // Northwest
            if (grid[x - 1] && grid[x - 1][y + 1]) {
                ret.push(grid[x - 1][y + 1]);
            }

            // Northeast
            if (grid[x + 1] && grid[x + 1][y + 1]) {
                ret.push(grid[x + 1][y + 1]);
            }
        }

        return ret;
    };

    Graph.prototype.toString = function () {
        var graphString = [];
        var nodes = this.grid;
        for (var x = 0; x < nodes.length; x++) {
            var rowDebug = [];
            var row = nodes[x];
            for (var y = 0; y < row.length; y++) {
                rowDebug.push(row[y].weight);
            }
            graphString.push(rowDebug.join(" "));
        }
        return graphString.join("\n");
    };

    function GridNode(x, y, weight) {
        this.x = x;
        this.y = y;
        this.weight = weight;
    }

    GridNode.prototype.toString = function () {
        return "[" + this.x + " " + this.y + "]";
    };

    GridNode.prototype.getCost = function (fromNeighbor) {
        // Take diagonal weight into consideration.
        if (fromNeighbor && fromNeighbor.x != this.x && fromNeighbor.y != this.y) {
            return this.weight * 1.41421;
        }
        return this.weight;
    };

    GridNode.prototype.isWall = function () {
        return this.weight === 0;
    };

    function BinaryHeap(scoreFunction) {
        this.content = [];
        this.scoreFunction = scoreFunction;
    }

    BinaryHeap.prototype = {
        push: function (element) {
            // Add the new element to the end of the array.
            this.content.push(element);

            // Allow it to sink down.
            this.sinkDown(this.content.length - 1);
        },
        pop: function () {
            // Store the first element so we can return it later.
            var result = this.content[0];
            // Get the element at the end of the array.
            var end = this.content.pop();
            // If there are any elements left, put the end element at the
            // start, and let it bubble up.
            if (this.content.length > 0) {
                this.content[0] = end;
                this.bubbleUp(0);
            }
            return result;
        },
        remove: function (node) {
            var i = this.content.indexOf(node);

            // When it is found, the process seen in 'pop' is repeated
            // to fill up the hole.
            var end = this.content.pop();

            if (i !== this.content.length - 1) {
                this.content[i] = end;

                if (this.scoreFunction(end) < this.scoreFunction(node)) {
                    this.sinkDown(i);
                } else {
                    this.bubbleUp(i);
                }
            }
        },
        size: function () {
            return this.content.length;
        },
        rescoreElement: function (node) {
            this.sinkDown(this.content.indexOf(node));
        },
        sinkDown: function (n) {
            // Fetch the element that has to be sunk.
            var element = this.content[n];

            // When at 0, an element can not sink any further.
            while (n > 0) {

                // Compute the parent element's index, and fetch it.
                var parentN = ((n + 1) >> 1) - 1;
                var parent = this.content[parentN];
                // Swap the elements if the parent is greater.
                if (this.scoreFunction(element) < this.scoreFunction(parent)) {
                    this.content[parentN] = element;
                    this.content[n] = parent;
                    // Update 'n' to continue at the new position.
                    n = parentN;
                }
                // Found a parent that is less, no need to sink any further.
                else {
                    break;
                }
            }
        },
        bubbleUp: function (n) {
            // Look up the target element and its score.
            var length = this.content.length;
            var element = this.content[n];
            var elemScore = this.scoreFunction(element);

            while (true) {
                // Compute the indices of the child elements.
                var child2N = (n + 1) << 1;
                var child1N = child2N - 1;
                // This is used to store the new position of the element, if any.
                var swap = null;
                var child1Score;
                // If the first child exists (is inside the array)...
                if (child1N < length) {
                    // Look it up and compute its score.
                    var child1 = this.content[child1N];
                    child1Score = this.scoreFunction(child1);

                    // If the score is less than our element's, we need to swap.
                    if (child1Score < elemScore) {
                        swap = child1N;
                    }
                }

                // Do the same checks for the other child.
                if (child2N < length) {
                    var child2 = this.content[child2N];
                    var child2Score = this.scoreFunction(child2);
                    if (child2Score < (swap === null ? elemScore : child1Score)) {
                        swap = child2N;
                    }
                }

                // If the element needs to be moved, swap it, and continue.
                if (swap !== null) {
                    this.content[n] = this.content[swap];
                    this.content[swap] = element;
                    n = swap;
                }
                // Otherwise, we are done.
                else {
                    break;
                }
            }
        }
    };

    return {
        astar: astar,
        Graph: Graph
    };
}
function find_player(screen) {
    for (let y = 0; y < screen.length; y++) {
        let row = screen[y];
        for (let x = 0; x < row.length; x++) {
            if (row[x] == 'A')
                return { x, y };
        }
    }
}
function bitmap(screen,player) {
    //let bitMap = screen.map(r=> '1'.repeat(screen.length).split(''));
    let bitMap = new Array(screen.length);
    for (var i = 0; i < screen.length; i++) {
        bitMap[i] = new Array(screen[i].length);
    }
    for (let y = 0; y < bitMap.length; y++) {
        for (let x = 0; x < bitMap[y].length; x++) {
            bitMap[y][x] = 1;
        }
    }
    for (let y = 0; y < screen.length; y++) {
        for (let x = 0; x < screen[y].length; x++) {
            if(screen[y][x]=='A')
            {
                if(screen[y-1][x]=='O')
                {
                    if(screen[y+2][x]=='+'||screen[y+2][x]=='O' || screen[y+2][x]=='#')
                        if(screen[y+1][x+1]=='+'||screen[y+1][x+1]=='O'|| screen[y+2][x]=='#')
                            if(screen[y+1][x-1]=='+'||screen[y+1][x-1]=='O'|| screen[y+2][x]=='#')
                                bitMap[y+1][x]=0;

                }
                if(screen[y][x+1]==' ')
                    if(screen[y-1][x+1]=='*')                      
                        bitMap[y][x+1]=1;
                if(screen[y][x-1]==' ')
                    if(screen[y-1][x-1]=='*')
                        bitMap[y][x-1]=1;

                                                                  

                // if(screen[y-1][x-1]=='O' || screen[y-1][x-1]=='+' || screen[y-1][x-1]=='*')
                //     if(screen[y-2][x-1]=='O' || screen[y-2][x-1]=='*')
                //         bitMap[y-1][x]=0;
                // if(screen[y-1][x+1]=='O' || screen[y-1][x+1]=='+' || screen[y-1][x+1]=='*')
                //     if(screen[y-2][x+1]=='O' || screen[y-2][x+1]=='*')
                //         bitMap[y-1][x]=0;
            }
            if (screen[y][x] == '/' || screen[y][x] == '|' || screen[y][x] == '\\' || screen[y][x] == '-')//butterfly
            {
                bitMap[y][x] = 0;
                bitMap[y + 1][x] = 0;
                bitMap[y - 1][x] = 0;
                bitMap[y][x + 1] = 0;
                bitMap[y][x - 1] = 0;
                bitMap[y + 1][x - 1] = 0;
                bitMap[y - 1][x - 1] = 0;
                bitMap[y + 1][x + 1] = 0;
                bitMap[y - 1][x + 1] = 0;
                if (y >= 2) bitMap[y - 2][x] = 0;
                if (y <= screen.length - 2) bitMap[y + 2][x] = 0;
                if (x >= 2) bitMap[y][x - 2] = 0;
                if (x <= screen[0].length - 2) bitMap[y][x + 2] = 0;
            }
            if (screen[y][x] == 'O')//stone
            {
                bitMap[y][x] = 0;
                if (screen[y - 1][x] == 'O' && screen[y - 1][x - 1] == ' ' && screen[y][x - 1] == ' ') {
                    bitMap[y][x - 1] = 0;
                }
                if (screen[y - 1][x] == '*' && screen[y - 1][x - 1] == ' ' && screen[y][x - 1] == ' ') {
                    bitMap[y][x - 1] = 0;
                }
                if (screen[y - 1][x] == 'O' && screen[y - 1][x + 1] == ' ' && screen[y][x + 1] == ' ') {
                    bitMap[y][x + 1] = 0;
                }
                if (screen[y - 1][x] == '*' && screen[y - 1][x + 1] == ' ' && screen[y][x + 1] == ' ') {
                    bitMap[y][x + 1] = 0;
                }
            }
            if (screen[y][x] == '+')//block
            {
                bitMap[y][x] = 0;
                if (screen[y - 1][x] == 'O' && screen[y - 1][x - 1] == ' ' && screen[y][x - 1] == ' ') {
                    bitMap[y][x - 1] = 0;
                }
                if (screen[y - 1][x] == '*' && screen[y - 1][x - 1] == ' ' && screen[y][x - 1] == ' ') {
                    bitMap[y][x - 1] = 0;
                }
                if (screen[y - 1][x] == 'O' && screen[y - 1][x + 1] == ' ' && screen[y][x + 1] == ' ') {
                    bitMap[y][x + 1] = 0;
                }
                if (screen[y - 1][x] == '*' && screen[y - 1][x + 1] == ' ' && screen[y][x + 1] == ' ') {
                    bitMap[y][x + 1] = 0;
                }
            }
            if (screen[y][x] == ' ')//air
                if (screen[y - 1][x] == 'O' || screen[y - 1][x] == '*') {
                    //bitMap[y + 2][x] = 0;
                    bitMap[y + 1][x] = 0;
                    bitMap[y][x] = 0;

                }
            if (screen[y][x] == '#')//hash
            {
                bitMap[y][x] = 0;
            }
            if (screen[y][x] == '*')//risky star
            {
                if (screen[y - 1][x] == 'O' && screen[y - 1][x - 1] == ' ' && screen[y][x - 1] == ' ') {
                    bitMap[y][x - 1] = 0;
                }
                if (screen[y - 1][x] == '*' && screen[y - 1][x - 1] == ' ' && screen[y][x - 1] == ' ') {
                    bitMap[y][x - 1] = 0;
                }
                if (screen[y - 1][x] == 'O' && screen[y - 1][x + 1] == ' ' && screen[y][x + 1] == ' ') {
                    bitMap[y][x + 1] = 0;
                }
                if (screen[y - 1][x] == '*' && screen[y - 1][x + 1] == ' ' && screen[y][x + 1] == ' ') {
                    bitMap[y][x + 1] = 0;
                }
                //gwiazdki blokujące kamienie lub gwiazdki xd
                if (screen[y - 1][x] == '*')
                    if (screen[y][x + 1] == ' ')
                        if (screen[y - 1][x + 1] == ' ')
                            bitMap[y][x + 1] = 0;
                if (screen[y - 1][x] == '*')
                    if (screen[y][x - 1] == ' ')
                        if (screen[y - 1][x - 1] == ' ')
                            bitMap[y][x - 1] = 0;
                if (screen[y + 1][x - 1] == '#') {
                    if (screen[y + 1][x] == '#')
                        if (screen[y + 1][x + 1] == '#')
                            if (screen[y - 1][x + 1] == 'O' || screen[y - 1][x + 1] == '+')
                                if ((screen[y][x + 1] == 'O' || screen[y][x + 1] == '+' ) || screen[y][x - 1] == 'O' || screen[y][x - 1] == '+')
                                    bitMap[y][x] = 0;
                }
                if (screen[y + 1][x] == 'O' || screen[y + 1][x] == '+') {
                    if (screen[y][x + 1] == 'O' || screen[y][x + 1] == '+')
                        if (screen[y][x - 1] == 'O' || screen[y][x - 1] == '+') {
                            if (screen[y - 1][x + 1] == 'O' || screen[y - 1][x + 1] == 'O')
                                bitMap[y][x] = 0;
                        }
                }
                if (screen[y + 1][x] == 'O' || screen[y + 1][x] == '+') {
                    if (screen[y - 1][x] == 'O' || screen[y - 1][x] == '+')
                        if (x >= 2 && x <= screen.length[0] - 3) {
                            if (screen[y][x + 1] == 'O' || screen[y][x + 1] == '+')
                                if (screen[y][x - 2] == 'O' || (screen[y][x - 2] == '+'))
                                    if (screen[y - 1][x - 2] == 'O')
                                        bitMap[y][x] = 0;
                            if (screen[y][x - 1] == 'O' || screen[y][x - 1] == '+')
                                if (screen[y][x + 2] == 'O' || (screen[y][x + 2] == '+'))
                                    if (screen[y - 1][x + 2] == 'O')
                                        bitMap[y][x] = 0;
                        }
                }
            }
            if (screen[y][x] == 'O' || screen[y][x] == '+' || screen[y][x] == '#')
                if (x >= 1 && x <= screen[0].length - 2 && y>=2) 
                if (screen[y-1][x-1] == 'O' || screen[y-1][x-1] == '+' || screen[y-1][x-1] == '#' )  
                    if (screen[y-1][x+1] == 'O' || screen[y-1][x+1] == '+' || screen[y-1][x+1] == '#' )
                    {
                        if (x >= 1 && x <= screen[0].length - 2 && y>=3)
                            if (screen[y-2][x-1] == 'O' || screen[y-2][x-1] == '+' || screen[y-2][x-1] == '#' )  
                                if (screen[y-2][x+1] == 'O' || screen[y-2][x+1] == '+' || screen[y-2][x+1] == '#' ) 
                                {

                                    bitMap[y-1][x] = 0;
                                    if (x >= 1 && x <= screen[0].length - 2 && y>=4)
                                    if (screen[y-3][x-1] == 'O' || screen[y-3][x-1] == '+' || screen[y-3][x-1] == '#' )  
                                        if (screen[y-3][x+1] == 'O' || screen[y-3][x+1] == '+' || screen[y-3][x+1] == '#' )
                                        {   
                                            bitMap[y-2][x] = 0;
                                            if (x >= 1 && x <= screen[0].length - 2 && y>=5)
                                            if (screen[y-4][x-1] == 'O' || screen[y-4][x-1] == '+' || screen[y-4][x-1] == '#' )  
                                                if (screen[y-4][x+1] == 'O' || screen[y-4][x+1] == '+' || screen[y-4][x+1] == '#' )
                                                {
                                                    bitMap[y-3][x] = 0;
                                                }
                                        }
                                }

                    }
            



        }
    }
    bitMap[player.y][player.x]=1;
    return bitMap;
}
function bitmap2(screen,player) {
    //let bitMap = screen.map(r=> '1'.repeat(screen.length).split(''));
    let bitMap = new Array(screen.length);
    for (var i = 0; i < screen.length; i++) {
        bitMap[i] = new Array(screen[i].length);
    }
    for (let y = 0; y < bitMap.length; y++) {
        for (let x = 0; x < bitMap[y].length; x++) {
            bitMap[y][x] = 1;
        }
    }
    for (let y = 0; y < screen.length; y++) {
        for (let x = 0; x < screen[y].length; x++) {
            if(screen[y][x]=='A')
            {
                if(screen[y-1][x]=='O')
                {
                    if(screen[y+2][x]=='+'||screen[y+2][x]=='O' || screen[y+2][x]=='#')
                        if(screen[y+1][x+1]=='+'||screen[y+1][x+1]=='O'|| screen[y+2][x]=='#')
                            if(screen[y+1][x-1]=='+'||screen[y+1][x-1]=='O'|| screen[y+2][x]=='#')
                                bitMap[y+1][x]=0;

                }
                if(screen[y][x+1]==' ')
                    if(screen[y-1][x+1]=='*')                      
                        bitMap[y][x+1]=1;
                if(screen[y][x-1]==' ')
                    if(screen[y-1][x-1]=='*')
                        bitMap[y][x-1]=1;                             
            }
            else if (screen[y][x] == '/' || screen[y][x] == '|' || screen[y][x] == '\\' || screen[y][x] == '-')//butterfly
            {
                bitMap[y][x] = 0;
                bitMap[y + 1][x] = 0;
                bitMap[y - 1][x] = 0;
                bitMap[y][x + 1] = 0;
                bitMap[y][x - 1] = 0;
                if(screen[y+1][x]==' ' || screen[y][x-1]==' ')bitMap[y + 1][x - 1] = 0;
                if(screen[y-1][x]==' ' || screen[y][x-1]==' ')bitMap[y - 1][x - 1] = 0;
                if(screen[y+1][x]==' ' || screen[y][x+1]==' ')bitMap[y + 1][x + 1] = 0;
                if(screen[y-1][x]==' ' || screen[y][x+1]==' ')bitMap[y - 1][x + 1] = 0;
                if (y >= 2)
                    if(screen[y-1][x]==' ') bitMap[y - 2][x] = 0;
                if (y <= screen.length - 2) 
                    if(screen[y+1][x]==' ') bitMap[y + 2][x] = 0;
                if (x >= 2) 
                    if(screen[y][x-1]==' ')bitMap[y][x - 2] = 0;
                if (x <= screen[0].length - 2)
                    if(screen[y][x+1]==' ')bitMap[y][x + 2] = 0;
                
            }
            else if (screen[y][x] == 'O')//stone
            {
                bitMap[y][x] = 0;
                if (screen[y - 1][x] == 'O' && screen[y - 1][x - 1] == ' ' && screen[y][x - 1] == ' ') {
                    bitMap[y][x - 1] = 0;
                }
                if (screen[y - 1][x] == '*' && screen[y - 1][x - 1] == ' ' && screen[y][x - 1] == ' ') {
                    bitMap[y][x - 1] = 0;
                }
                if (screen[y - 1][x] == 'O' && screen[y - 1][x + 1] == ' ' && screen[y][x + 1] == ' ') {
                    bitMap[y][x + 1] = 0;
                }
                if (screen[y - 1][x] == '*' && screen[y - 1][x + 1] == ' ' && screen[y][x + 1] == ' ') {
                    bitMap[y][x + 1] = 0;
                }
            }
            else if (screen[y][x] == '+')//block
            {
                bitMap[y][x] = 0;
                if (screen[y - 1][x] == 'O' && screen[y - 1][x - 1] == ' ' && screen[y][x - 1] == ' ') {
                    bitMap[y][x - 1] = 0;
                }
                if (screen[y - 1][x] == '*' && screen[y - 1][x - 1] == ' ' && screen[y][x - 1] == ' ') {
                    bitMap[y][x - 1] = 0;
                }
                if (screen[y - 1][x] == 'O' && screen[y - 1][x + 1] == ' ' && screen[y][x + 1] == ' ') {
                    bitMap[y][x + 1] = 0;
                }
                if (screen[y - 1][x] == '*' && screen[y - 1][x + 1] == ' ' && screen[y][x + 1] == ' ') {
                    bitMap[y][x + 1] = 0;
                }
            }
            else if (screen[y][x] == ' ')//air
                if (screen[y - 1][x] == 'O' || screen[y - 1][x] == '*') {
                    //bitMap[y + 2][x] = 0;
                    bitMap[y + 1][x] = 0;
                    bitMap[y][x] = 0;

                }
            else if (screen[y][x] == '#')//hash
            {
                bitMap[y][x] = 0;
            }
            else if (screen[y][x] == '*')//risky star
            {
                if (screen[y - 1][x] == 'O' && screen[y - 1][x - 1] == ' ' && screen[y][x - 1] == ' ') {
                    bitMap[y][x - 1] = 0;
                }
                if (screen[y - 1][x] == '*' && screen[y - 1][x - 1] == ' ' && screen[y][x - 1] == ' ') {
                    bitMap[y][x - 1] = 0;
                }
                if (screen[y - 1][x] == 'O' && screen[y - 1][x + 1] == ' ' && screen[y][x + 1] == ' ') {
                    bitMap[y][x + 1] = 0;
                }
                if (screen[y - 1][x] == '*' && screen[y - 1][x + 1] == ' ' && screen[y][x + 1] == ' ') {
                    bitMap[y][x + 1] = 0;
                }
                if (screen[y + 1][x - 1] == '#') {
                    if (screen[y + 1][x] == '#')
                        if (screen[y + 1][x + 1] == '#')
                            if (screen[y - 1][x + 1] == 'O' || screen[y - 1][x + 1] == '+')
                                if ((screen[y][x + 1] == 'O' || screen[y][x + 1] == '+' ) || screen[y][x - 1] == 'O' || screen[y][x - 1] == '+')
                                    bitMap[y][x] = 0;
                }
                if (screen[y + 1][x] == 'O' || screen[y + 1][x] == '+') {
                    if (screen[y][x + 1] == 'O' || screen[y][x + 1] == '+')
                        if (screen[y][x - 1] == 'O' || screen[y][x - 1] == '+') {
                            if (screen[y - 1][x + 1] == 'O' || screen[y - 1][x + 1] == 'O')
                                bitMap[y][x] = 0;
                        }
                }
                if (screen[y + 1][x] == 'O' || screen[y + 1][x] == '+') {
                    if (screen[y - 1][x] == 'O' || screen[y - 1][x] == '+')
                        if (x >= 2 && x <= screen.length[0] - 3) {
                            if (screen[y][x + 1] == 'O' || screen[y][x + 1] == '+')
                                if (screen[y][x - 2] == 'O' || (screen[y][x - 2] == '+'))
                                    if (screen[y - 1][x - 2] == 'O')
                                        bitMap[y][x] = 0;
                            if (screen[y][x - 1] == 'O' || screen[y][x - 1] == '+')
                                if (screen[y][x + 2] == 'O' || (screen[y][x + 2] == '+'))
                                    if (screen[y - 1][x + 2] == 'O')
                                        bitMap[y][x] = 0;
                        }
                }
            }
        }
    }
    bitMap[player.y][player.x]=1;
    return bitMap;
}
function starlist(screen, player, grid) {
    let starList = [];
    for (let y = 0; y < screen.length; y++) {
        let row = screen[y];
        for (let x = 0; x < row.length; x++) {
            if (row[x] == '*') {
                starList.push({ x, y });
            }
        }
    }
    let { astar, Graph } = getAstar();

    let weightGrid = Array.from(grid, (n)=> n.map(k => Number(k)));

    let mapGraph = new Graph(weightGrid);

    let startPoint = mapGraph.grid[player.y][player.x];

    let weights = starList.map((endPoint) => {
        return {
            steps: astar.search(mapGraph, startPoint, mapGraph.grid[endPoint.y][endPoint.x]).length,
            x: endPoint.x,
            y: endPoint.y
        }
    }).filter(isReachable).sort((a, b) => a.steps - b.steps);
    console.log('A:',player);
    return weights;
}
function isReachable(point) {
    return point.steps !== 0;
}

exports.play = function* (screen) {
    //throw new Error();
    
    let {astar,Graph} = getAstar();
    while (true) {
        console.time('allgame');
        let player = find_player(screen);
        //console.time('bitmap');
        let bitMap = bitmap(screen,player);
        //console.timeEnd('bitmap');
        //console.time('stars');
        let stars = starlist(screen,player,bitMap);
        //console.timeEnd('stars');
        let moves = '';

        if(stars.length)
        {
            let graph = new Graph(bitMap);
            let start = graph.grid[player.y][player.x];
            let end = graph.grid[stars[0].y][stars[0].x];
            let result = astar.search(graph, start, end).map(a=>{return {x:a.y,y:a.x}});

            
            
            
            let move;
            if(result.length)
            {
                move = (player.y-result[0].y)+2*(player.x-result[0].x);
                switch(move) {
                    case 1:
                        moves+='u';
                        break;
                    case -1:
                        moves+='d';
                        break;
                    case 2:
                        moves+='l';
                        break;
                    case -2:
                        moves+='r';
                        break;
                }
            }
        }
        else
        {
            if(screen[player.y][player.x+1]=='O' && screen[player.y][player.x+2]==' ')moves+='r';
            else if(screen[player.y][player.x-1]=='O' && screen[player.y][player.x-2]==' ')moves+='l';
            else if(screen[player.y][player.x-1]=='O'&&screen[player.y-1][player.x]=='O')moves+='r';
            else if(screen[player.y][player.x+1]=='O'&&screen[player.y-1][player.x]=='O')moves+='l';      
        }
        console.log('\n',bitMap.map(row => row.join('')));
        console.timeEnd('allgame');

       yield moves[Math.floor(Math.random() * moves.length)];

    }
};
