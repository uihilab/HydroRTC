<?php

require('write-json.php');
require('get-param.php');
require('enableCORS.php');

if (getParam('roomId')) {
    $response = createRoom(getParam('roomId'));
    
    if ($response != true) {
        echo $response;
    }
    
    echo $response;
    exit();
}
?>