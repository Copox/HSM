var streamStatus = {
    error:0,
    done:0,
    canPlay:false
}

var songBuffer;  
function appendBuffer(buffer1, buffer2) {
    var numberOfChannels = Math.min( buffer1.numberOfChannels, buffer2.numberOfChannels );
    var tmp = audioContext.createBuffer( numberOfChannels, (buffer1.length + buffer2.length), buffer1.sampleRate );
    for (var i=0; i<numberOfChannels; i++) {
      var channel = tmp.getChannelData(i);
      channel.set( buffer1.getChannelData(i), 0);
      channel.set( buffer2.getChannelData(i), buffer1.length);
    }
    return tmp;
  }


function getSong(key){
    let request = new XMLHttpRequest();
    request.open('GET',songList[key].url,false);
    request.send(null);
    if(request.status>= 200 && request.status<= 299){
        audioContext.decodeAudioData(request.response,buf => {
            streamStatus.done++;
            if(!buf)
                streamStatus.error++;
            else{
                if(streamStatus.done === 0)
                    songBuffer = buf;
                else
                    songBuffer = appendBuffer(appendBuffer,buf);
                if(streamStatus.done >= songList.length){
                    console.log('done');
                }else{
                    setTimeout(getSong,1,streamStatus.done + 1);
                }
            }
        });
    }else{
        streamStatus.error++;
        streamStatus.done++;
    }
}