class Tile{
    constructor(pos, name, spriteManager, material){
        this.sprite = new BABYLON.Sprite(name, spriteManager);
        this.sprite.position = pos;
        this.sprite.size = 0.5;
        this.sprite.isVisible = false;
        this.sprite.cellRef = 9;
        this.sprite.isPickable = false;

        this.spriteBOX = new BABYLON.MeshBuilder.CreateBox("Box-"+name, {size: 0.5}, scene);
        this.spriteBOX.position = pos;
        this.spriteBOX.isVisible = false;
        this.spriteBOX.isPickable = false;
        this.spriteBOX.material = material;
    }

    toggle(state){
        this.sprite.isVisible = state;
        this.sprite.isPickable = state;
        this.spriteBOX.isVisible = state;  
        this.spriteBOX.isPickable = state;
    }

    isVisible(){
        return this.sprite.isVisible;
    }

    setSprite(index){
        this.sprite.cellRef = index;
    }

    getSpriteIndex(){
        return this.sprite.cellRef;
    }

    getMesh(){
        return this.spriteBOX;
    }
}


class Corner{
    constructor(pos){
        this.pos = pos;
        this.enabled = false;
    }

    toggle(state){
        this.enabled = state;
    }

    position(){
        return this.pos;
    }

    isEnabled(){
        return this.enabled;
    }
}

var spriteMaterial;
var shadowMaterial;
var renderTexture;

class MapManager{
    constructor(scene, size, camera){
        this.scene = scene;
        this.gridSize = size;
        this.gridSizeMax = Math.floor(size) * 2;
        let tileSetJSON;
        
        $.getJSON('assets/tileset.json').done(function (data) {
            tileSetJSON = data;
        });
        
        
        this.spriteManager = new BABYLON.SpritePackedManager("spriteManager", "assets/tileset.png", //https://i.imgur.com/nZddxBC.png
            this.gridSize * this.gridSize * 4, scene, JSON.stringify(tileSetJSON), 0, BABYLON.Texture.NEAREST_SAMPLINGMODE); // tiles
        this.spriteManager.isPickable = true;
        this.spriteManager.fogEnabled = false;
        this.tiles = [];
        this.camera = camera;
        this.shadowMesh = new BABYLON.Mesh("shadowMesh", this.scene);
        this.shadowData = new BABYLON.VertexData();
        spriteMaterial = new BABYLON.StandardMaterial("transparent", this.scene);
        spriteMaterial.alpha = 0.0;
        shadowMaterial = new BABYLON.StandardMaterial("shadowMat", this.scene);
        shadowMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);
        shadowMaterial.alpha = 0.0;
    
        this.shadowMesh.material = shadowMaterial;

        // Ground
        this.ground = BABYLON.MeshBuilder.CreateGround("grid", {width: this.gridSize, height: this.gridSize, subdivisions: 1}, scene);
        this.ground.position = new BABYLON.Vector3(0, -1, 0);

        // Material
        let gridMaterial = new BABYLON.StandardMaterial("gridMaterial", this.scene); // https://i.imgur.com/k7aCzjv.png
        gridMaterial.emissiveTexture = new BABYLON.Texture("assets/ground.png", this.scene, false, false, BABYLON.Texture.NEAREST_SAMPLINGMODE);
        gridMaterial.emissiveTexture.uScale = this.gridSize * 2;
        gridMaterial.emissiveTexture.vScale = this.gridSize * 2;
        this.ground.material = gridMaterial;

        // Corners
        this.tileCorners = []; // Holds every single corner in a 2D array
        this.tileCornersActive = []; // 1D sorted array holding every active corner, used for mesh points

        for(let x = 0; x <= this.gridSizeMax + 1; x++){
            this.tileCorners[x] = [];
            for(let z = 0; z <= this.gridSizeMax + 1; z++){
                this.tileCorners[x][z] = new Corner(
                    new BABYLON.Vector3(-this.gridSize / 2 + (x / 2.0), 1, -this.gridSize / 2 + (z / 2.0))
                );
            }
        }

        this.depthMap = scene.enableDepthRenderer(); 
        renderTexture = this.depthMap.getDepthMap(); 
        renderTexture.activeCamera = this.camera;
        renderTexture.renderList = [];
        renderTexture.renderList.push(this.shadowMesh);
        this.scene.customRenderTargets.push(renderTexture);
        
        renderTexture.onBeforeBindObservable.add(function(){
            spriteMaterial.alpha = 1.0;
            shadowMaterial.alpha = 1.0;
        });

        renderTexture.onAfterUnbindObservable.add(function(){
            spriteMaterial.alpha = 0.0;
            shadowMaterial.alpha = 0.0;
        });

        BABYLON.Effect.ShadersStore['customFragmentShader'] = `
            precision highp float;
        
            uniform sampler2D textureSampler;
            uniform sampler2D depthSampler;

            varying vec2 vUV;

            void main(void){
                vec4 depthSample = texture2D(depthSampler, vUV);
                vec4 textureSample = texture2D(textureSampler, vUV);

                if(depthSample.x > 0.5){
                    // IN SHADOW
                    gl_FragColor = textureSample * 0.1;
                }else{
                    // OUT OF SHADOW
                    gl_FragColor = textureSample;
                }
            }
        `;

        // POST PROCESSING
        this.postProcess = new BABYLON.PostProcess("shadow", "custom", [], ["depthSampler"], 1.0, this.camera);
        this.postProcess.onApply = function(effect){
            effect.setTexture("depthSampler", renderTexture);
        };


        this.spriteFormIndexes = [
            9,9,3,3,9,9,3,3,12,12,30,7,12,12,30,7,0,0,24,24,0,0,1,1,6,6,16,34,6,6,32,36,9,9,3,3,9,9,3,3,12,12,30,7,12,12,30,7,0,0,24,24,0,0,1,1,6,6,16,34,6,6,32,36,5,5,4,4,5,5,4,4,31,31,17,33,31,31,17,33,25,25,10,10,25,25,28,28,11,11,15,44,11,11,45,23,5,5,4,4,5,5,4,4,8,8,35,38,8,8,35,38,25,25,10,10,25,25,28,28,27,27,43,22,27,27,40,14,9,9,3,3,9,9,3,3,12,12,30,7,12,12,30,7,0,0,24,24,0,0,1,1,6,6,16,34,6,6,32,36,9,9,3,3,9,9,3,3,12,12,30,7,12,12,30,7,0,0,24,24,0,0,1,1,6,6,16,34,6,6,32,36,5,5,4,4,5,5,4,4,31,31,17,33,31,31,17,33,2,2,26,26,2,2,39,39,29,29,46,41,29,29,18,20,5,5,4,4,5,5,4,4,8,8,35,38,8,8,35,38,2,2,26,26,2,2,39,39,37,37,21,13,37,37,19,42
        ];

        this.spriteCornerIndexes = [];
        this.spriteCornerIndexes.push([1, 1, 0, 0]); // 0
        this.spriteCornerIndexes.push([1, 0, 0, 0]); // 1
        this.spriteCornerIndexes.push([0, 1, 0, 0]); // 2
        this.spriteCornerIndexes.push([1, 0, 1, 0]); // 3
        this.spriteCornerIndexes.push([0, 0, 0, 0]); // 4
        this.spriteCornerIndexes.push([0, 1, 0, 1]); // 5
        this.spriteCornerIndexes.push([0, 0, 0, 0]); // 6
        this.spriteCornerIndexes.push([0, 0, 1, 0]); // 7
        this.spriteCornerIndexes.push([0, 0, 0, 1]); // 8
        this.spriteCornerIndexes.push([1, 1, 1, 1]); // 9
        this.spriteCornerIndexes.push([0, 0, 1, 1]); // 10
        this.spriteCornerIndexes.push([1, 0, 1, 0]); // 11
        this.spriteCornerIndexes.push([0, 0, 1, 1]); // 12    
        this.spriteCornerIndexes.push([0, 0, 0, 1]); // 13
        this.spriteCornerIndexes.push([0, 0, 1, 0]); // 14
        this.spriteCornerIndexes.push([1, 1, 1, 1]); // 15
        this.spriteCornerIndexes.push([0, 1, 0, 1]); // 16
        this.spriteCornerIndexes.push([1, 1, 0, 0]); // 17
        this.spriteCornerIndexes.push([1, 1, 0, 0]); // 18
        this.spriteCornerIndexes.push([0, 1, 0, 0]); // 19
        this.spriteCornerIndexes.push([1, 0, 0, 0]); // 20
        this.spriteCornerIndexes.push([0, 1, 0, 1]); // 21
        this.spriteCornerIndexes.push([0, 0, 1, 1]); // 22
        this.spriteCornerIndexes.push([1, 0, 1, 0]); // 23
        this.spriteCornerIndexes.push([1, 0, 0, 1]); // 24
        this.spriteCornerIndexes.push([0, 1, 1, 0]); // 25
        this.spriteCornerIndexes.push([0, 0, 0, 1]); // 26
        this.spriteCornerIndexes.push([0, 0, 1, 0]); // 27
        this.spriteCornerIndexes.push([0, 0, 1, 0]); // 28
        this.spriteCornerIndexes.push([1, 0, 0, 0]); // 29
        this.spriteCornerIndexes.push([0, 1, 1, 0]); // 30
        this.spriteCornerIndexes.push([1, 0, 0, 1]); // 31
        this.spriteCornerIndexes.push([0, 1, 0, 0]); // 32
        this.spriteCornerIndexes.push([1, 0, 0, 0]); // 33
        this.spriteCornerIndexes.push([0, 0, 0, 1]); // 34
        this.spriteCornerIndexes.push([0, 1, 0, 0]); // 35
        this.spriteCornerIndexes.push([0, 0, 0, 0]); // 36
        this.spriteCornerIndexes.push([0, 0, 0, 0]); // 37
        this.spriteCornerIndexes.push([0, 0, 0, 0]); // 38
        this.spriteCornerIndexes.push([0, 0, 0, 0]); // 39
        this.spriteCornerIndexes.push([0, 1, 1, 0]); // 40
        this.spriteCornerIndexes.push([1, 0, 0, 1]); // 41
        this.spriteCornerIndexes.push([0, 0, 0, 0]); // 42
        this.spriteCornerIndexes.push([0, 1, 1, 1]); // 43
        this.spriteCornerIndexes.push([1, 0, 1, 1]); // 44
        this.spriteCornerIndexes.push([1, 1, 1, 0]); // 45
        this.spriteCornerIndexes.push([1, 1, 0, 1]); // 46
    }

    // Create tiles
    initTiles(){
        // Grid
        for(let x = 0; x <= this.gridSizeMax; x++){
            this.tiles[x] = [];
            for(let z = 0; z <= this.gridSizeMax; z++){
                let tile = new Tile(new BABYLON.Vector3((x / 2) - (this.gridSizeMax / 4), 1, (z / 2) - (this.gridSizeMax / 4)),
                    "sprite" + (x*this.gridSizeMax)+z, this.spriteManager, spriteMaterial);
                this.tiles[x][z] = tile;
                
                renderTexture.renderList.push(tile.getMesh());
            }
        }   

        // Border
        for(let x = 0; x <= this.gridSizeMax; x++){
            for(let z = 0; z <= this.gridSizeMax; z++){
                // TOP and BOTTOM
                if(x == 0)
                    this.enableBlockAtPosition(new BABYLON.Vector3((z / 2) - this.gridSize / 2, 0, -this.gridSize / 2), true);
                if(x == this.gridSizeMax)
                    this.enableBlockAtPosition(new BABYLON.Vector3((z / 2) - this.gridSize / 2, 0, this.gridSize / 2), true);

                // LEFT and RIGHT
                if(z == 0)
                    this.enableBlockAtPosition(new BABYLON.Vector3((z / 2) - this.gridSize / 2, 0, (x / 2) - this.gridSize / 2), true);
                if(z == this.gridSizeMax);
                    this.enableBlockAtPosition(new BABYLON.Vector3((z / 2) - -this.gridSize / 2, 0, (x / 2) - this.gridSize / 2), true);
            }
        }
    }

    update(){
        this.castRays();
    }

    castRays(){
        if(this.tileCornersActive.length <= 0) return;
        
        let shadowPoints = [];
            
        let cursor = this.scene.pick(this.scene.pointerX, this.scene.pointerY).pickedPoint;
        if(cursor == null) return;

        cursor.y = 1;
        let directionOffset = [new BABYLON.Quaternion.FromEulerAngles(0, 0.00001, 0), new BABYLON.Quaternion.FromEulerAngles(0, -0.00001, 0)];

        for(let i = 0; i < this.tileCornersActive.length; i++){
            let corner = this.tileCornersActive[i].position();
            let direction = BABYLON.Vector3.Normalize(corner.subtract(cursor));
            
            for(let j = 0; j <= 2; j++){
                let directionVector = new BABYLON.Vector3(direction.x, direction.y, direction.z);;
                if(j > 0) directionVector.rotateByQuaternionAroundPointToRef(directionOffset[j - 1], corner, directionVector);

                let ray = new BABYLON.Ray(cursor, directionVector, 15);
    
                let rayHit = this.scene.pickWithRay(ray, undefined, false);
    
                if(rayHit.hit){
                    shadowPoints.push(rayHit.pickedPoint);
                }
            }
        }

        // Sort points
        shadowPoints.sort(function(a, b){
            let angle_A = Math.atan2(a.z - cursor.z, a.x - cursor.x) * 180 / Math.PI;
            let angle_B = Math.atan2(b.z - cursor.z, b.x - cursor.x) * 180 / Math.PI;

            if(angle_A < angle_B)
                return -1;
            else
                return 1;
        });

        // Create Mesh
        let vertices = [];
        let indices = [];

        for(let i = 0; i < shadowPoints.length; i++){
            let point = (i + 1 >= shadowPoints.length) ? shadowPoints[0] : shadowPoints[i+1];
            vertices.push(cursor.x, 0, cursor.z);
            vertices.push(shadowPoints[i].x, 0, shadowPoints[i].z);
            vertices.push(point.x, 0, point.z);

            indices.push(i * 3, 1 + i * 3, 2 + i * 3);
        }

        this.shadowData.positions = vertices;
        this.shadowData.indices = indices;
        this.shadowData.applyToMesh(this.shadowMesh);
    }


    enableBlockAtPosition(pos, state){
        let gridPos = this.positionToGridIndex(pos);
        let tile = this.atGrid(gridPos);

        if(tile != null){
            tile.toggle(state);
            this.updateTile(gridPos);
        }
    }

    // State, true = add - false = remove
    enableBlockAtCursor(state){
        var result = this.scene.pick(this.scene.pointerX, this.scene.pointerY);

        if(result.hit) {
            var gridPos = this.positionToGridIndex(result.pickedPoint);

            if(gridPos.x >= 1 && gridPos.x <= this.gridSizeMax - 1 && gridPos.z >= 1 && gridPos.z <= this.gridSizeMax - 1){
                let tile = this.atGrid(gridPos);

                if(tile != null){
                    tile.toggle(state);
                    this.updateTile(gridPos);
                }
            }
        }
    }

    updateCornersAroundBlock(pos){
        if(pos.x >= 0 && pos.x <= this.gridSizeMax && pos.z >= 0 && pos.z <= this.gridSizeMax){

            let grid = [];
            for(let x = 0; x < 4; x++)
                grid[x] = [0, 0, 0, 0];

            for(let x = 0; x < 3; x++){
                for(let z = 0; z < 3; z++){
                    let tile = this.atGrid(new BABYLON.Vector3(pos.x + x - 1, 0, pos.z + z - 1));
                    if(tile!=null){
                        if(tile.isVisible()){
                            let index = tile.getSpriteIndex();
                            grid[x + 1][z] += this.spriteCornerIndexes[index][0];
                            grid[x][z] += this.spriteCornerIndexes[index][1];
                            grid[x + 1][z + 1] += this.spriteCornerIndexes[index][2];
                            grid[x][z + 1] += this.spriteCornerIndexes[index][3];
                        }
                    }
                }
            }

            this.tileCorners[pos.x][pos.z].toggle((grid[1][1] >= 1) ? 1 : 0)
            this.tileCorners[pos.x][pos.z + 1].toggle((grid[1][2] >= 1) ? 1 : 0)
            this.tileCorners[pos.x + 1][pos.z].toggle((grid[2][1] >= 1) ? 1 : 0)
            this.tileCorners[pos.x + 1][pos.z + 1].toggle((grid[2][2] >= 1) ? 1 : 0)
        }
    }

    // Updates the active corners array
    getActiveCorners(){
        this.tileCornersActive.length = 0;

        for(let x = 0; x <= this.gridSizeMax; x++){
            for(let z = 1; z <= this.gridSizeMax; z++){
                if(this.tileCorners[x][z].isEnabled()){
                    this.tileCornersActive.push(this.tileCorners[x][z]);
                }
            }
        }
    }

    // Converts a position to closest tile position
    positionToGrid(pos){
        var result = new BABYLON.Vector3(Math.round(pos.x * 2) / 2, 0, Math.round(pos.z * 2) / 2);
        
        var max = Math.floor(this.gridSize / 2);

        if(result.x < -max) result.x = -max;
        if(result.x > max) result.x = max;
        if(result.z < -max) result.z = -max;
        if(result.z > max) result.z = max;
      
        return result;
    }

    // Converts a position to closest index in the grid array
    positionToGridIndex(pos){
        var result = this.positionToGrid(pos);
        return new BABYLON.Vector3((result.x + Math.floor(this.gridSize / 2)) * 2, 0, (result.z + Math.floor(this.gridSize / 2)) * 2);
    }

    // Returns tile at grid position, null if position is out of range
    atGrid(pos){
        if(pos.x >= 0 && pos.x <= this.gridSizeMax && pos.z >= 0 && pos.z <= this.gridSizeMax)
            return this.tiles[pos.x][pos.z];
        return null;
    }

    // Update a single tile that updates neighbours
    updateTile(pos){
        for(let x = 0; x < 3; x++)
            for(let z = 0; z < 3; z++)
                this.updateNeighbours(new BABYLON.Vector3(pos.x + x - 1, 0, pos.z + z - 1));

        this.updateCornersAroundBlock(pos);
        this.getActiveCorners();
    }

    // Update neighbour tiles with updated sprites
    updateNeighbours(pos){
        let currentTile = this.atGrid(pos);
        if(currentTile==null) return;
        if(!currentTile.isVisible()) return;

        var bits = 0;

        let index = 0;
        for(let x = 0; x < 3; x++){
            for(let z = 0; z < 3; z++){
                if(x == 1 && z == 1) continue;
                let tile = this.atGrid(new BABYLON.Vector3(pos.x + x - 1, 0, pos.z + z - 1));

                bits = bits | ((tile == null) ? 0 : (tile.isVisible()) ? 1 : 0) << index;
                ++index;
            }
        }

        this.atGrid(pos).setSprite(this.spriteFormIndexes[bits].toString());
    }
}