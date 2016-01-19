
var NaviBarText=["Create a New Story","Listen to Your Story","Change your Story","Pick a Story"]
var currentStoryID=null;
var curCategory=""
var is_Playing=false
var curJSON={"Title": "", "Author": "", "dateCreated": "", "Path":[]};
var chosen="none"; //Keep track of the focused element in the soundList
var currentSpeech=new SpeechSynthesisUtterance();

function playErrorSound(){
    stopSound()
    playSound("ErrorSounds/ErrorBuzz.mp3")
}

function stopSound(){
    soundManager.stopAll();
    window.speechSynthesis.cancel();
}



//Set the cookie
function createCookie(name,value,days) {
    if (days) {
        var date = new Date();
        date.setTime(date.getTime()+(days*24*60*60*1000));
        var expires = "; expires="+date.toGMTString();
    }
    else var expires = "";
    document.cookie = name+"="+value+expires+"; path=/";
}

//Reading a cookie
function readCookie(name) {
    return new Promise(function(resolve,reject){
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for(var i=0;i < ca.length;i++) {
            var c = ca[i];
            while (c.charAt(0)==' ') c = c.substring(1,c.length);
            if (c.indexOf(nameEQ) == 0) resolve(c.substring(nameEQ.length,c.length));
        }
        resolve(null);
    });
    
}

//Erasing a cookie
function eraseCookie(name) {
    return new Promise(function(resolve,reject){
        createCookie(name,"",-1);
        resolve();
    });
    
}

//Function using textToSpeech to say a given string
function speak(textToSpeak) {
   // Create a new instance of SpeechSynthesisUtterance
   stopSound()

   // Set the text
   currentSpeech.text = textToSpeak;
   // Add this text to the utterance queue
   window.speechSynthesis.speak(currentSpeech);
}

//Plays all sounds in the story in sequence
function playList(x,y,names){
    soundManager.setup({
        url:'C:/soundManager/swf/',

        onready: function(){

        },

        ontimeout: function(){

        }
    });

    if(names[x]instanceof Blob){
        var link=window.URL.createObjectURL(names[x])
    }  
    else{
        var link=names[x]
    }

    if (x!=y){
        var mySound=soundManager.createSound({

            url: link,
            onfinish: function(){
                soundManager._writeDebug('finished playing audio file '+x);
                playList(x+1,y,names);
            }
        })
        mySound.play();
    }
    else{
      is_Playing=false;
    }
}

//Function to play an individual sound given a blob
function playSound(myBlob){
    soundManager.setup({
        url:'C:/soundManager/swf/',

        onready: function(){

        },

        ontimeout: function(){

        }
    });  
    if(myBlob instanceof Blob){
        var link=window.URL.createObjectURL(myBlob)
    }  
    else{
        var link=myBlob
    }
    
    var mySound=soundManager.createSound({
        url: link,
        onfinish: function(){
            soundManager._writeDebug('finished playing audio file ');
        }
    })
    mySound.play(); 
}

// - initialize the pre-recorded sound library database
// - Promise will reject if the database is unable to initialize
// - Promise will resolve and return the database if the initialization is complete
// - If the database does not exist when initSLDB is called then a new database will be created and the onupgradedneeded
//   function is called and the desired object stores will be created
// - If the database already exists then initSLDB will open the database and return it
function initSLDB(name){
    return new Promise(function(resolve,reject){
        

        //Initializing the database
        var request=indexedDB.open(name,1);

        //Reject if the db is null
        if(!request){
            reject("Open returns null");
        }

        //Reject if there was an error while opening the db
        request.onerror=function(event){
            reject("Error occured while opening the database");
        };

        //When the database does not already exist create the database and add these object stores
        request.onupgradeneeded=function(event){
            var db=event.target.result;
            var SoundLibraryStore = event.currentTarget.result.createObjectStore(
                     "Categories", { keyPath: "id", autoIncrement: true });

            SoundLibraryStore.createIndex("soundLibraryPath", "soundLibraryPath" , {unique: true });

        };

        request.onversionchange=function(event){
            
            event.target.close();
        }

        //Return the db on success
        request.onsuccess=function(event){
            var db=event.target.result;
            resolve(db);
        };
    });
}

// - initialize the pre-recorded sound library database
// - Promise will reject if the database is unable to initialize
// - Promise will resolve and return the database if the initialization is complete
// - If the database does not exist when initDB is called then a new database will be created and the onupgradedneeded
//   function is called and the desired object stores will be created
// - If the database already exists then initDB will open the database and return it
function initDB(name){
    return new Promise(function(resolve,reject){

        //Reject if indexedDB cant be found
        if(!window.indexedDB){
            reject("Failed to initialize indexedDB");
        }

        var request=indexedDB.open(name,1);

        //Reject if the db is null
        if(!request){
            reject("Open returns null");
        }

        //Reject if there was an error while opening the db
        request.onerror=function(event){
            reject("Error occured while opening the database");
        };

        //When the database does not already exist create the database and add these object stores
        request.onupgradeneeded=function(event){
            var db=event.target.result;
            var SoundStore = event.currentTarget.result.createObjectStore(
                     "Sounds", { keyPath: "id", autoIncrement: true });

            SoundStore.createIndex("Blobs", "Blobs" , {unique: true });
            var StoryStore = event.currentTarget.result.createObjectStore(
                     "Stories", { keyPath: "id", autoIncrement: true });

            StoryStore.createIndex("StoryJSON", "StoryJSON" , {unique: false });
        };

        request.onversionchange=function(event){
            event.target.close();
        }

        //Return the db on success
        request.onsuccess=function(event){
            var db=event.target.result;
            resolve(db);
        };
    });
}

//Retrieve a record in the objectStore of db by id
function get(db,storeName,id){
    return new Promise(function(resolve,reject){
        var tempID=parseInt(id);
        
        //All actions to the indexedDB happen through transactions so to perform and actions on the database
        //you first have to initialize the transaction on the object store you want to modify and specify the type 
        //of transaction. ie. readonly,writeonly,readwrite
        var transaction=db.transaction([storeName],"readwrite");

        //Retrieve the object store you want to modify through the transaction
        var objectStore=transaction.objectStore(storeName);
        console.log("Id to be retrieved: "+tempID+" from "+storeName);

        //request the record in the objectstore by id
        //the success and failure handlers are functions you can call when the request is either fulfilled or denied
        var request=objectStore.get(tempID);
        request.onsuccess=function(e){       
            //NOTE: this does not return the value in the record itself. It returns the ENTIRE request. 
            //To get the actual value you have to call request.fieldNameOfYourChoice
            resolve(request);
        };

        request.onerror=function(error){
            reject(error);
        };
    });
}

//Get the links for the sound files in the current path
function getBlobs(db){
    temp=[]
    //console.log(curJSON.Path)
    for(x=0;x<curJSON.Path.length;x++){
        if((curJSON.Path[x] instanceof String) || (typeof curJSON.Path[x]==="string")){
            temp[x]=curJSON.Path[x]
        }
        else{
            temp[x]=get(db,"Sounds",curJSON.Path[x])
        }
    }
    console.log(temp)
    return Promise.all(temp);
       
}

//return the number of items in the Stories objectstore
function countDB(db,storeName){
    return new Promise(function(resolve,reject){
        var transaction = db.transaction([storeName], 'readonly');
        var objectStore = transaction.objectStore(storeName);
            
        var countRequest = objectStore.count();
        countRequest.onsuccess = function() {
          resolve(countRequest.result);
        }
    });
}

//Adds a category to the Categories object store in the sound library db
//The db you pass into this function has to contain the Categories object store 
function addCategory(db,name,librarySounds){
    return new Promise(function(resolve,reject){
        var transaction=db.transaction(["Categories"],"readwrite");
        var objectStore=transaction.objectStore("Categories");
        
        var request=objectStore.add({"categoryName":name,"categorySounds":librarySounds});
        request.onsuccess=function(e){
            console.log("New category has been created");
            curJSON.id=request.result
            resolve(request.result);
        };
        request.onerror=function(){
            console.log("Error has occured creating the category");
            reject();
        };
        request.onblocked=function(){
            console.log("New category creation was blocked");
            reject();
        };
    });
}

//Get the shortcuts for the sound library
function getLibraryMenu(){
    return new Promise(function(resolve,reject){
        //Getting all of the information for the sound library from a txt file
        $.get('sound_lib_shortcut.txt', function(myContentFile) {
           var lines = myContentFile.split("\r\n");
           var start=0
           var endIndex=0
           for(var x=0;x<parseInt(lines[0]);x++){
                path=[]
                start=start+1
                categoriesArray[x]=lines[start]
                start=start+1
                endIndex=parseInt(lines[start])
                libPaths[x]=new Array(endIndex)
                for(var y=0;y<endIndex;y++){
                    //console.log(start, endIndex)
                    start=start+1
                    libPaths[x][y]=lines[start]
                }               
           }
           resolve();
        }, 'text');

    });
}

function voiceReady(){
    return new Promise(function(resolve,reject){
        speechSynthesis.onvoiceschanged=function(){
            var voices=speechSynthesis.getVoices()
            currentSpeech.voice=voices[2]
            resolve()
        }
    });
}

//RESET DATABASES
/*initDB("SamiSays").then(function(db){
    db.close();
    var request=indexedDB.deleteDatabase("SamiSays");
    request.onsuccess=function(){
        initDB("SamiSays");
        console.log("DB was deleted");
    };
    request.onerror=function(){
        console.log("Delete failed");
    };
    request.onblocked=function(){
        console.log("Delete blocked");
    };
});


initSLDB("SoundLibrary").then(function(db){
    db.close();
    var request=indexedDB.deleteDatabase("SoundLibrary");
    request.onsuccess=function(){
        initSLDB("SoundLibrary");
        console.log("sDB was deleted");
    };
    request.onerror=function(){
        console.log("Delete failed");
    };
    request.onblocked=function(){
        console.log("Delete blocked");
    };
});

eraseCookie("StoryID")*/



//If a story has already been chosen preserve it
readCookie("StoryID").then(function(data){

    if(data!=null){
        currentStoryID=data
        
        initDB("SamiSays").then(function(db){
            get(db,"Stories",data).then(function(newJSON){
                curJSON=newJSON.result;
            });
        });
    }
});
    



voiceReady().then(function(){
    speak("What would you like to do? Use the left and right arrows to hear your options and press down to choose what you want to do")
});

//Keyboard commands
//-----------------

$(document).on('keyup', function(e) {
    if(false==false){
        //Press right to switch focus
        if(e.keyCode == 39){
            if (chosen === "none"){
                chosen=0;
                speak(NaviBarText[chosen])
                $('#NaviBar li').removeClass('NaviSelected');
                $('#NaviBar li:eq('+chosen+')').addClass('NaviSelected');
            }
            else if((chosen+1) < NaviBarText.length){
                chosen++;
                speak(NaviBarText[chosen])
                $('#NaviBar li').removeClass('NaviSelected');
                $('#NaviBar li:eq('+chosen+')').addClass('NaviSelected');
            }
            else if(chosen+1 == NaviBarText.length){
                playErrorSound();
            }
            
        }
        else if(e.keyCode == 37){
            if (chosen === "none"){
                chosen=0;
                speak(NaviBarText[chosen])
                $('#NaviBar li').removeClass('NaviSelected');
                $('#NaviBar li:eq('+chosen+')').addClass('NaviSelected');
            }
            else if(chosen - 1 >= 0){
                chosen--;
                speak(NaviBarText[chosen])
                $('#NaviBar li').removeClass('NaviSelected');
                $('#NaviBar li:eq('+chosen+')').addClass('NaviSelected');
            }
            else if(chosen - 1 < 0){
                playErrorSound();
            }
            
        }


        //Execute the appropriate action when an action from the navigation bar is selected
        else if(e.keyCode == 40 && chosen!="none"){
          if(NaviBarText[chosen]=="Create a New Story"){
            
            if(readCookie("StoryID")!=null){
                eraseCookie("StoryID")
                window.location.replace("SamiSays_StoryMode.html")
            }
            else{
                window.location.replace("SamiSays_StoryMode.html")
            }
          }
          else if(NaviBarText[chosen]=="Pick a Story"){
            initDB("SamiSays").then(function(db){
                countDB(db,"Stories").then(function(numStories){
                    console.log(numStories)
                    if(numStories==0){
                        speak("You have not created any Stories yet! Choose Create a new Story to make a story")
                    }
                    else if(numStories==1){
                        speak("You dont have any other stories yet! Choose create a new story to make another story")
                        
                    }
                    else{
                        window.location.replace("SamiSays_SelectionMode.html")
                    }
                });
            });
          }
          else if(NaviBarText[chosen]=="Listen to Your Story"){
            if(curJSON.Path.length!=0){
                initDB("SamiSays").then(function(db){
                    getBlobs(db).then(function(soundBlobs){
                        is_Playing = true;
                        stopSound()
                        //console.log(soundBlobs)
                        for(x=0;x<soundBlobs.length;x++){
                            var temp = soundBlobs[x]
                            if(!((temp instanceof String) || (typeof temp==="string"))){
                                temp = temp.result.Blobs
                            }
                            soundBlobs[x] = temp
                        }
                        playList(0,soundBlobs.length,soundBlobs)
                        current_mode="NaviBar"
                    });
                });
            }  
            else{
                speak("You have not picked or made a story yet")
            }   
          }
          else{
            if(curJSON.Path.length!=0){
                window.location.replace("SamiSays_StoryMode.html")
            }
            else{
                speak("You have not made or picked a story yet!")
            }
          }
          //Play error sound when a key is pressed that doesnt do anything
        
    }

    else{
            playErrorSound();
        }
  }
});