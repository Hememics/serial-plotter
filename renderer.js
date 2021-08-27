// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const SerialPort = require('serialport');
const serialport = require('serialport');
const tableify = require('tableify');


var currentSerialPort = null;

async function listSerialPorts() {
  await serialport.list().then((ports, err) => {
    if(err) {
      document.getElementById('error').textContent = err.message
      return
    } else {
      document.getElementById('error').textContent = ''
    }
    console.log('ports', ports);

    if (ports.length === 0) {
      document.getElementById('error').textContent = 'No ports discovered'
    }

    //tableHTML = tableify(ports)
    //document.getElementById('ports').innerHTML = tableHTML

    var serial_port_list = document.getElementById("serial-ports");

    var selected_port_p_desc = "";

    if (serial_port_list.options.length > 0){
      selected_port_p_desc = serial_port_list.options[serial_port_list.selectedIndex].text;
    }

    serial_port_list.options.length = 0;

    ports.forEach(function(port, idx){
      let p_desc = port.manufacturer + " " + port.path;

      var option = document.createElement('option');
      option.text = p_desc;
      option.value = port.path;
      serial_port_list.add(option);

      if (p_desc === selected_port_p_desc){
        serial_port_list.selectedIndex = idx;
      }
    });

  });
};


const max_terminal_chars = 10000;
var terminal_buffer = "";

function recv_port_data(data) {


  terminal_buffer = terminal_buffer + data.toString();

  let extra = terminal_buffer.length - max_terminal_chars;

  if (extra > 0){
    terminal_buffer = terminal_buffer.slice(extra);
  }


  let textarea = document.getElementById("terminal_text_box");

  textarea.value = terminal_buffer;

  if (document.getElementById("autoscroll_check").checked){
    textarea.scrollTop = textarea.scrollHeight;
  }

}

function connect() {

  var serial_port_list = document.getElementById("serial-ports");

  if (serial_port_list.options.length == 0) {
    document.getElementById('error').textContent = 'No serial ports found';
  }else{

    let port_path = serial_port_list.options[serial_port_list.selectedIndex].value;

    if (currentSerialPort){
      currentSerialPort.close();
    }

    const port = new SerialPort(port_path, 
      {
        baudRate: 115200
      },
      function(err){
        if (err) {
          document.getElementById('error').textContent = 'Error: ' + err.message;
          return console.log('Error: ', err.message);
        }
    });

    currentSerialPort = port;

    port.on('data', recv_port_data);

  }

}

// Set a timeout that will check for new serialPorts every 2 seconds.
// This timeout reschedules itself.
setTimeout(function listPorts() {
  listSerialPorts();
  setTimeout(listPorts, 2000);
}, 2000);