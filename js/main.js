var canvas;
var engine;
var scene;
var spriteManager;
var camera;


//const gridSize = 8.5;
//const gridSizeMax = Math.floor(gridSize) * 2;

var map;

const background = new BABYLON.Color3(0.165, 0.153, 0.169);

// Objects
//var grid;
var pointer;

// 0 Left, 1 Middle, 2 Right
var isMouseKeyDown = [false, false, false];

function start(){
    canvas = document.getElementById('renderCanvas');
    engine = new BABYLON.Engine(canvas, false);
    
    scene = createScene();
    engine.runRenderLoop(function() {
        scene.render(); 
    });

    // EVENT: Resize
    window.addEventListener('resize', function() {
         engine.resize();

        var target_width = 10;
        var target_height = 10;
        var a = target_width / target_height;
        var v = canvas.width / canvas.height;

        if(v >= a){
            camera.orthoLeft = -v/a * target_width/2.0;
            camera.orthoRight = v/a * target_width/2.0;
            camera.orthoBottom = -target_height/2.0;
            camera.orthoTop = target_height/2.0;
        }else{
            camera.orthoLeft = -target_width/2.0;
            camera.orthoRight = target_width/2.0;
             camera.orthoBottom = -a/v * target_height/2.0;
            camera.orthoTop = a/v * target_height/2.0;
        }
    });  

    // Input
    window.addEventListener('pointerdown', function(e){ if(e.button >= 0 && e.button <= 2) isMouseKeyDown[e.button] = true; });
    window.addEventListener('pointerup', function(e){ if(e.button >= 0 && e.button <= 2) isMouseKeyDown[e.button] = false; });
    document.addEventListener('pointerleave', function(){ for(var i = 0; i < 3; i++) isMouseKeyDown[i] = false; });
    
    // Disable Right Click Menu
    $('body').on('contextmenu', '#renderCanvas', function(e){ return false; });
}

function createScene(){
    var scene = new BABYLON.Scene(engine);
    scene.clearColor = background;
    scene.registerBeforeRender(update);

    camera = new BABYLON.TargetCamera('camera1', new BABYLON.Vector3(0, 5, 0), scene);
    camera.mode = camera.ORTHOGRAPHIC_CAMERA;
    camera.setTarget(BABYLON.Vector3.Zero());
    camera.attachControl(canvas, false);

    var target_width = 10;
    var target_height = 10;
    var a = target_width / target_height;
    var v = canvas.width / canvas.height;

    if(v >= a){
        camera.orthoLeft = -v/a * target_width/2.0;
        camera.orthoRight = v/a * target_width/2.0;
        camera.orthoBottom = -target_height/2.0;
        camera.orthoTop = target_height/2.0;
    }else{
        camera.orthoLeft = -target_width/2.0;
        camera.orthoRight = target_width/2.0;
        camera.orthoBottom = -a/v * target_height/2.0;
        camera.orthoTop = a/v * target_height/2.0;
    }

    map = new MapManager(scene, 8.5, camera);
    map.initTiles();

    // Pointer
    const points = [ 
        new BABYLON.Vector3(-0.25, 0,-0.25), new BABYLON.Vector3(-0.25, 0, 0.25), 
        new BABYLON.Vector3( 0.25, 0, 0.25), new BABYLON.Vector3( 0.25, 0,-0.25), 
        new BABYLON.Vector3(-0.25, 0,-0.25) 
    ];
    pointer = BABYLON.Mesh.CreateLines('lines1', points, scene);
    pointer.color = new BABYLON.Color3(1, 0, 0);
    pointer.setEnabled(false);
    pointer.isPickable = false;


    return scene;
}


function update() {
    if(isMouseKeyDown[0])
        map.enableBlockAtCursor(true);
        
    if (isMouseKeyDown[2])
        map.enableBlockAtCursor(false);


    if(isMouseKeyDown[0] || isMouseKeyDown[2]){
        pointer.setEnabled(true);
        let result = scene.pick(scene.pointerX, scene.pointerY);

        if(result.hit){
            let point = map.positionToGrid(result.pickedPoint);
            pointer.position = new BABYLON.Vector3(point.x, 1, point.z);
        }
    }else{
        pointer.setEnabled(false);
    }


    map.update();
}

