// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const { contextBridge } = require('electron');
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


Plotly.plot('live-plot', [{
  y: [],
  mode: 'lines',
  line: {color: '#80CAF6'}
}]);


// Format of the data:
// For one data point:
// [<label>:] value [, [<label>:] <value>, ... ] \n

var data_buff = ""

var y_vals_buff = [[]]

var lastSec = 0;

function plot_data(new_data) {
  var curr_idx = data_buff.length;

  data_buff = data_buff + new_data;

  var nl_idx = data_buff.indexOf('\n');

  if (nl_idx >= 0){
    data_point_string = data_buff.substring(0, nl_idx);

    data_buff = data_buff.substring(nl_idx + 1);

    // replace \r with spaces for compatability
    data_point_string = data_point_string.replace(/\r/g, ' ');

    values = data_point_string.split(',');

    y_vals = []
    y_labels = []

    values.forEach(function(val_str, idx) {
      let c_idx = val_str.indexOf(':');

      var label = (idx + 1).toString();
      var datum_string = "";

      if (c_idx >= 0){
        label = val_str.substring(0, c_idx);
        datum_string = val_str.substring(c_idx + 1);
      }else{
        datum_string = val_str;
      }

      let datum_val = parseFloat(datum_string);

      y_vals.push([datum_val]);

      y_labels.push(label);

      y_vals_buff[0].push(datum_val)

      if (y_vals_buff[0].length > 1000){
        y_vals_buff[0].shift()
      }

    });

    let currentsec = (new Date()).valueOf();

    if (currentsec > lastSec + 500){

      Plotly.update('live-plot', {
        y: y_vals_buff
      }, [0]);

      lastSec = currentsec;

    }

  }

}


const max_terminal_chars = 10000;
var terminal_buffer = "";

function recv_port_data(data) {


  data_str = data.toString()

  plot_data(data_str);

  terminal_buffer = terminal_buffer + data_str;

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