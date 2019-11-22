
var audioContext = null;
var bufferSource = null;
var gainNode = null;

var streamStatus = {
    error:0,
    done:0
}


function createAudioContext() {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.log('audioContext failed');
    }
}

function resetAuido(){
    bufferSource && bufferSource.stop();
    createAudioContext();
    bufferSource = null;
    gainNode = null;
}

function createBufferSource(config) {
    bufferSource = audioContext.createBufferSource();
    bufferSource.buffer = config.buffer;
    bufferSource.loop = config.loop || false;
    bufferSource.onended = () => {
      bufferSource = null;
    };
}
function createGainNode() {
    gainNode = audioContext.createGain();
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
    request.open('GET',getSongDetailById(songScript[key].id).url,true);
    request.responseType = 'arraybuffer';
    request.onload = () =>{
        audioContext.decodeAudioData(request.response,buf => {
            streamStatus.done++;
            if(!buf)
                streamStatus.error++;
            else{
                if(streamStatus.done === 1)
                    songBuffer = buf;
                else
                    songBuffer = appendBuffer(songBuffer,buf);
                if(streamStatus.done >= songScript.length){
                    vm.$data.canPlaystream = true;
                    vm.$data.waitDialog = false;
                }else{
                    setTimeout(getSong,1,streamStatus.done);
                }
            }
        });
    };
    request.onerror = () => {
        streamStatus.error++;
        streamStatus.done++;
        if(streamStatus.done >= songScript.length){
            vm.$data.canPlaystream = true;
            vm.$data.waitDialog = false;
        }else{
            setTimeout(getSong,1,streamStatus.done);
        }
    };
    request.send();
}


function fetchJSON(url){
    try{
        let request = new XMLHttpRequest();
        request.open('GET',url,false);
        request.send(null);
        if(request.status >= 200 && request.status <= 299)
            return JSON.parse(request.responseText);
    }catch(e){
        return null;
    }
}

function searchAuthorByName(keyword){
    let authors = [];
    if(allAuthors && allAuthors.authors){
        for(let a of allAuthors.authors){
            let f = true;
            for(let b of keyword){
                if(!a.includes(b)){
                    f = false;
                    break;
                }
            }
            if(f)
                authors.push(a);
        }
    }
    return authors;
}


function searchSongByAuthors(authors){
    var songs = [],id = new Array(133);
    for(let a of authors){
        let t = fetchJSON('https://copox.github.io/Doc/HSM/authors/' + encodeURIComponent(a) + '.json');
        if(t && t.songs.length){
            for(let s of t.songs){
                let key = s.id%133;
                if(id[key] && !id[key].includes(s.id)){
                    id[key].push(s.id);
                    songs.push(s);
                }
                else if(!id[key]){
                    id[key] = [s.id];
                    songs.push(s);
                }
            }
        }
    }
    return songs;
}

function searchSongByName(keyword){
    var songs = [];
    let c = encodeURIComponent([...keyword][0]);
    let t = fetchJSON('https://copox.github.io/Doc/HSM/title/' + c + '.json');
    if(t && t.songs){
        for(let e of t.songs){
            let f = true;
            for(let d of keyword){
                if(!e.title.includes(d)){
                    f = false;
                    break;
                }
            }
            if(f)
                songs.push(e);
        }
    }
    return songs;
}

var allAuthors = fetchJSON('https://copox.github.io/Doc/HSM/data/authors.json');





const toolbar = [
    {
        title:'Search',
        tabId:0,
        icon:'mdi-file-search-outline'
    },
    {
        title:'Songs',
        tabId:1,
        icon:'mdi-file-music-outline'
    },
    {
        title:'Stream',
        tabId:2,
        icon:'mdi-stack-overflow'
    }
];
const searchType = [
    {
        title:'author',
        id:0,
    },
    {
        title:'song',
        id:1
    }
];

var songList = [];
var searchList = [];
var songScript = null;

var vm = new Vue({
    el: '#HSM',
    vuetify: new Vuetify(),
    data:{
        toolbar:toolbar,
        searchType:searchType,
        searchDialog:false,
        searchResult:[],
        isDerepList:false,
        listSource:null,
        detailDialog:false,
        detailSong:{
            id:-1,
            title:'loading ...',
            authors:['loading ...'],
            url:''
        },
        changeBtn:true,
        changeBtnText:['Add','Remove'],
        changeBtnColor:['success','warning'],
        searchKeyword:'',
        searchStatus:0,
        playerDialog:false,
        playBtnText:['Play','Stop'],
        playBtn:false,
        canPlaystream:false,
        waitDialog:false,
        scirptOfSongs:'',
    },
    methods:{
        tabChange:function (id){
            switch (id) {
                case 0:
                    this.listSource = searchList;
                    this.isDerepList = false;
                    break;
                case 1:
                    this.listSource = songList;
                    this.isDerepList = true;
                    break;
                case 2:
                default:
                    this.playerDialog = true;
                    this.scirptOfSongs = strJSON(this.getScriptFromSongs());
                    break;
            }
        },
        selectSong:function(id){
            this.detailDialog = true;
            this.changeBtn = this.checkSongRep(id);
            this.detailSong = getSongDetailById(id);
            //console.log(this.detailSong);
        },
        checkSongRep:function(id){
            for(let i of songList)
                if(i.id === id && !i.del)
                    return true;
            return false;
        },
        changeSongList:function(name,id,type){
            //console.log(this.listSource);
            this.changeBtn = !this.changeBtn;
            for(let i of songList){
                if(i.id === id){
                    i.del = !i.del;
                    this.detailDialog = false;
                    return;
                }
            }
            songList.push({
                title:name,
                id:id,
                del:false
            });
            this.detailDialog = false;
        },
        searchSong:function(){
            if(this.searchKeyword.trim()){
                switch(this.searchStatus){
                    case 0:
                        this.searchByName(this.searchKeyword.trim().toLowerCase());
                    break;
                    default:
                        this.searchBySong(this.searchKeyword.trim().toLowerCase());
                    break;
                }
            }
            this.searchDialog = false;
            this.tabChange(0);
        },
        searchByName:function(name){
            searchList = searchSongByAuthors(searchAuthorByName(name));
        },
        searchBySong:function(keyword){
            searchList = searchSongByName(keyword);
        },
        getSongNum:function(){
            return songList.length;
        },
        getStreamStatus:function(){
            return 'Done : ' + streamStatus.done + ' , Error : ' + streamStatus.error; 
        },
        createStream:function(){
            this.waitDialog = true;
            var buffer = [];
            let o = parseJSON(this.scirptOfSongs);
            songScript = o&&o.songs;
            if(songScript && songScript.length){
                resetAuido();
                this.playBtn = false;
                this.canPlaystream = false;
                streamStatus.done = 0;
                streamStatus.error = 0;
                getSong(0);
            }else
                this.waitDialog = false;
            this.playerDialog = false;
        },
        playStream:function(){
            if(this.playBtn){
                bufferSource && bufferSource.stop();
            }else{
                createBufferSource({
                    buffer:songBuffer,
                    loop: true });
                createGainNode();
                bufferSource.connect(gainNode);
                gainNode.connect(audioContext.destination);
                bufferSource.start();
                gainNode.gain.value = 0.5;
            }
            this.playBtn = !this.playBtn;
        },
        getScriptFromSongs:function(){
            var s = {
                songs:[]
            };
            for(let e of songList){
                if(!e.del)
                    s.songs.push(e);
            }
            return s;
        },
        checkScript:function(){
            return !!parseJSON(this.scirptOfSongs);
        }
    }
});

function parseJSON(str){
    try{
        return JSON.parse(str);
    }catch(e){
        return null;
    }
}

function strJSON(obj){
    try{
        return JSON.stringify(obj);
    }catch(e){
        return '';
    }
}


function getSongDetailById(id){
    let s = {
        id:-1,
        title:'loading ...',
        authors:['loading ...'],
        url:''
    };
    let r = fetchJSON('https://copox.github.io/Doc/HSM/songs/' + id + '.json');
    if(r)
        s = r;
    return r;
}