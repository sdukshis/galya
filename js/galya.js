/**************************************************************\ 
* GaLyA processor emulator http://github.com/sdukshis/galya    *
*  by Filonov Pavel (filonovpv at gmail.com)                   *
\**************************************************************/

var rows = 16;
var cols = 16;
var cell_size = 30;
var ram_canvas, cpu_canvas;
var ram_ctx, cpu_ctx;
var active_cell_row = 1;
var active_cell_col = 1;
var RAM = [];
var NUM_REGS = 8;
var R = [0, 0, 0, 0, 0, 0, 0, 0];
var IP = 0;
var CARRY = 0;
var ZERO = 0;
var runable = false;

const SET = 0x09;
const LOD = 0x0A;
const STO = 0x0B;
const MOV = 0x0C;
const LDA = 0x0D;
const STA = 0x0E;


const ADD = 0x20;
const SUB = 0x21;
const CMP = 0x22;
const ADC = 0x23;
const INC = 0x24;
const DEC = 0x25;

const MUL = 0x26;
const DIV = 0x27;
const MOD = 0x28;

const JMP = 0x30;
const JZ  = 0x31;
const JNZ = 0x32;
const JE  = 0x31;
const JNE = 0x32;
const JL  = 0x33;
const JG  = 0x34;
const JLE = 0x35;
const JGE = 0x36;


const PSH = 0x40;
const POP = 0x41;

const CAL = 0x50;
const RET = 0x51;

const HLT = 0xFF;
const NOP = 0x00;

function doStep(){
    if(!runable){
        step();
        draw();
    }
}

function start(){
    runable = false;
    IP = 0;
    ZERO = 0;
    CARRY = 0;
    R = [0, 0, 0, 0, 0, 0, 0, 0];
    draw();
}

function run(){
    runable = true;
    process();
}

function stop(){
    runable = false;
}

function process(){
    if(runable){
        if(RAM[IP] != HLT){
            step();
            draw();
            var freq = document.getElementById("freq");
            f = freq.options[freq.selectedIndex].value;
            window.setTimeout("process();", 1000/f);
        }
    }
}

function step(){
    switch(RAM[IP]){
        case SET: {R[RAM[IP+1]] = RAM[IP + 2];  IP += 3;} break;
        case LOD: {R[RAM[IP+1]] = RAM[RAM[IP + 2]]; IP += 3;} break;
        case STO: {RAM[RAM[IP + 2]] = R[RAM[IP + 1]]; IP += 3;} break;
        case MOV: {R[RAM[IP+1]] = R[RAM[IP+2]]; IP += 3;} break;
        case LDA: {R[RAM[IP+1]] = RAM[R[RAM[IP+2]]]; IP += 3;} break;
        case STA: {RAM[R[RAM[IP + 2]]] = R[RAM[IP + 1]]; IP +=3;} break;

        case ADD: {R[RAM[IP+1]] = add(R[RAM[IP+1]], R[RAM[IP+2]]); IP += 3;} break;
        case ADC: {R[RAM[IP+1]] = add(R[RAM[IP+1]] + CARRY, R[RAM[IP+2]]); IP += 3;} break;
        case SUB: {R[RAM[IP+1]] = sub(R[RAM[IP+1]], R[RAM[IP+2]]); IP += 3;} break;
        case INC: {R[RAM[IP+1]] = add(R[RAM[IP+1]], 1); IP += 2;} break;
        case DEC: {R[RAM[IP+1]] = sub(R[RAM[IP+1]], 1); IP += 2;} break;

        case MUL: {R[RAM[IP+1]] = mul(R[RAM[IP+1]], R[RAM[IP+2]]); IP += 3;} break;
        case DIV: {R[RAM[IP+1]] = mdiv(R[RAM[IP+1]], R[RAM[IP+2]]); IP += 3;} break;
        case MOD: {R[RAM[IP+1]] = mod(R[RAM[IP+1]], R[RAM[IP+2]]); IP += 3;} break;

        case CMP: {sub(R[RAM[IP+1]], R[RAM[IP+2]]); IP += 3;} break;

        case PSH: {R[7] = sub(R[7],1); RAM[R[7]] = R[RAM[IP+1]];  IP+=2; } break;
        case POP: {R[RAM[IP+1]] = RAM[R[7]]; R[7] = add(R[7],1); IP+=2; } break;

        case JMP: {IP = RAM[IP+1];} break;
        case JZ : {if(ZERO) IP = RAM[IP + 1]; else IP += 2;} break;
        case JNZ: {if(!ZERO) IP = RAM[IP + 1]; else IP += 2;} break;
        case JL : {if(!CARRY && !ZERO) IP = RAM[IP + 1]; else IP +=2; } break;  
        case JG : {if(CARRY && !ZERO) IP = RAM[IP + 1]; else IP +=2; } break;  
        case JLE: {if(!CARRY || ZERO) IP = RAM[IP + 1]; else IP +=2; } break;  
        case JGE: {if(CARRY) IP = RAM[IP + 1]; else IP +=2; } break;

        case CAL: {R[7] = sub(R[7], 1); RAM[R[7]] = IP + 2; IP = RAM[IP + 1]; } break;
        case RET: {IP = RAM[R[7]]; R[7] = add(R[7], 1); } break;

        case NOP: {IP += 1;} break;  
    }
    if(IP > 255) IP = 0;
}
function add(fst, snd){
        res = fst + snd;
        CARRY = (res > 255)? 1 : 0;
        res %= 256;
        ZERO = (res == 0)? 1 : 0;
        
        return res;
}

function sub(fst, snd){
        res = fst - snd;
        CARRY = (res >= 0)? 1 : 0;
        if(res < 0) {
            res += 256;
        }
        ZERO = (res == 0)? 1 : 0;

        return res;
}

function mul(fst, snd){
        return fst*snd;
}

function mdiv(fst, snd){
        return (fst - fst%snd)/snd;
}

function mod(fst, snd){
        return fst%snd;
}


function init(){
    ram_canvas = document.getElementById("ram");
    ram_ctx = ram_canvas.getContext("2d");

    ram_canvas.onclick = function(e){
        var x = (e.pageX - ram_canvas.offsetLeft);
        var y = (e.pageY - ram_canvas.offsetTop);

        click_event(x, y);
    }

    cpu_canvas = document.getElementById("cpu");
    cpu_ctx = cpu_canvas.getContext("2d");


    for(i = 0; i < 256; ++i){
        RAM[i] = 0;
    }

    draw();
}

function onKeyPress(e){
    active_cell = active_cell_row*cols + active_cell_col;
    switch(e.keyCode){
        case 0x25: --active_cell_col;   break; // left
        case 0x26: --active_cell_row;   break; // up
        case 0x27: ++active_cell_col;   break; // right
        case 0x28: ++active_cell_row;   break; // down
        case 0x2E: RAM[active_cell] = 0;break; // del
        default:{ 
            if((e.keyCode >= 0x30) && (e.keyCode <= 0x39)) // 0..9
                RAM[active_cell] = (RAM[active_cell]%16)*16 + e.keyCode - 0x30;
            if((e.keyCode >= 0x40) && (e.keyCode <= 0x46)) // A..F
                RAM[active_cell] = (RAM[active_cell]%16)*16 + e.keyCode - 0x37;

        }
        break;
    }
    if(active_cell_row == -1)   active_cell_row = 0;
    if(active_cell_row == rows) active_cell_row = rows - 1;
    if(active_cell_col == -1)   active_cell_col = 0;
    if(active_cell_col == cols) active_cell_col = cols - 1;
    draw();
}

function draw(){
    drawRAM();
    drawCPU();
}

function drawRAM(){
    ram_ctx.clearRect(0, 0, 600, 640);
    ram_ctx.font = "16pt Arial"
    for(row = 0; row < rows; ++row){
        ram_ctx.fillText(row.toString(16).toUpperCase(), 0, (row + 1.6)*cell_size);
    }
    for(col = 0; col < cols; ++col){
        ram_ctx.fillText(col.toString(16).toUpperCase(), (col + 1.4)*cell_size, cell_size*0.5);
    }
    i = 0;
    for(y = cell_size; y < (rows + 1)*cell_size; y += cell_size){
        for(x = cell_size; x < (cols + 1)*cell_size; x += cell_size){
            ram_ctx.strokeRect(x, y, cell_size, cell_size);
            ram_ctx.fillText(toHex(RAM[i]), x + cell_size*0.1, y + cell_size*0.75);
            ++i;
        }
    }
    if((active_cell_row != -1) && (active_cell_col != -1)){
    ram_ctx.save();
        ram_ctx.strokeStyle = "rgb(255, 0 ,0)";
        ram_ctx.lineWidth = 4;
        ram_ctx.strokeRect((active_cell_col + 1)*cell_size, (active_cell_row + 1)*cell_size, cell_size, cell_size);
        ram_ctx.stroke();
        ram_ctx.restore();
    }
    
    current_cell_row = Math.floor(IP/16);
    current_cell_col = IP%16;   
    ram_ctx.save();
    ram_ctx.strokeStyle = "rgb(0, 0 ,255)";
    ram_ctx.lineWidth = 4;
    ram_ctx.strokeRect((current_cell_col + 1)*cell_size, (current_cell_row + 1)*cell_size, cell_size, cell_size);
    ram_ctx.stroke();
    ram_ctx.restore();

}

function drawCPU(){
    cpu_ctx.clearRect(0,0, 200, 640);
    cpu_ctx.font = "16pt Arial"
    // Draw registers
    for(i = 0; i < NUM_REGS; ++i){
        cpu_ctx.fillText("R" + i.toString(), 0, 2*cell_size*(i + 1) - 0.25*cell_size);
        cpu_ctx.strokeRect(cell_size, 2*cell_size*(i + 0.5), cell_size, cell_size);
        cpu_ctx.fillText(toHex(R[i]), cell_size*1.1, 2*cell_size*(i + 1) - 0.25*cell_size);
    }
    // Draw instruction pointer
    cpu_ctx.fillText("IP", 0, 2*cell_size*(i + 1) - 0.25*cell_size);
    cpu_ctx.strokeRect(cell_size, 2*cell_size*(i + 0.5), cell_size, cell_size);
    cpu_ctx.fillText(toHex(IP), cell_size*1.1, 2*cell_size*(i + 1) - 0.25*cell_size);

    // Draw flags
    cpu_ctx.fillText("CF", 0, 2*cell_size*(i + 2) - 0.5*cell_size);
    cpu_ctx.save();
    cpu_ctx.strokeStyle="rgb(0,0,0)";
    if(CARRY){
        cpu_ctx.fillStyle = "rgb(255, 0 ,0)";
    } else {
        cpu_ctx.fillStyle = "rgb(255, 255 ,255)";
    }
    cpu_ctx.beginPath();
    cpu_ctx.arc(cell_size*1.5, 2*cell_size*(i + 2) - 0.6*cell_size, 10, 0, 2*Math.PI, true);
    cpu_ctx.closePath();
    cpu_ctx.stroke();
    cpu_ctx.fill();
    cpu_ctx.restore();

    cpu_ctx.fillText("ZF", 2.25*cell_size, 2*cell_size*(i + 2) - 0.5*cell_size);
    cpu_ctx.save();
    cpu_ctx.strokeStyle="rgb(0,0,0)";
    if(ZERO){
        cpu_ctx.fillStyle = "rgb(255, 0 ,0)";
    } else {
        cpu_ctx.fillStyle = "rgb(255, 255 ,255)";
    }
    cpu_ctx.beginPath();
    cpu_ctx.arc(cell_size*3.5, 2*cell_size*(i + 2) - 0.6*cell_size, 10, 0, 2*Math.PI, true);
    cpu_ctx.closePath();
    cpu_ctx.stroke();
    cpu_ctx.fill();
    cpu_ctx.restore();

}

function click_event(x, y){
    if( (x >= cell_size)      &&
        (x <= (cols + 1)*cell_size) &&
        (y >= cell_size)      &&
        (y <= (rows + 1)*cell_size)) {
        active_cell_col = Math.floor(x/cell_size - 1);
        active_cell_row = Math.floor(y/cell_size - 1);
    }

    draw();
}

function toHex(byte){
    if (byte > 15) {
        return byte.toString(16).toUpperCase();
    } else {
        return "0" + byte.toString(16).toUpperCase();
    }
}