var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.msIndexedDB;
var IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction;
var db;
var sBlobs=[]
var is_Playing=false;
var recording=false;
var in_library=false;
var current_mode="NaviBar"
var currentStoryID=null;
var curJSON={"Title": "", "Author": "", "dateCreated": "", "Path":[]}
var currentSpeech=new SpeechSynthesisUtterance();
var categoriesArray=[];
var libPaths=[];
var ActionDict={"Make a Sound":"Record","Add a Sound":"Sound_Library","Listen to your story":"Playback","Change your Story":"Edit"}
var NaviBarText=["Make a Sound","Add a Sound","Listen to your story","Change your Story","Go back to Main Menu"]
var curCategory="none"
var chosen="none"; //Keep track of the focused element in the soundList
var currentSpeech=new SpeechSynthesisUtterance();
var NaviBarInstructions="What would you like to do. Use the left and right arrows to listen to your options and press the down arrow to choose what you want to do"


function playErrorSound(){
    stopSound()
    playSound("ErrorSounds/ErrorBuzz.mp3")
}

function stopSound(){
    //if(is_Playing==false){
        soundManager.stopAll();
        window.speechSynthesis.cancel();
    //}
    
}


function speak(textToSpeak) {
   // Create a new instance of SpeechSynthesisUtterance
   stopSound()

   // Set the text
   currentSpeech.text = textToSpeak;
   // Add this text to the utterance queue
   window.speechSynthesis.speak(currentSpeech);
}

//Changes the CSS of the carousel when an action has been chosen
function addFocus(){
  $('.item').css({
    "text-align": "center",
    "border": "yellow medium solid",
    
    "background-color": "#fff",
  });
}

//Reverts CSS of the carousel to normal when the user returns to the navigation bar
function removeFocus(){
  $('.item').css({
    "text-align": "center",
    "border": "#cdcdcd medium solid",
     
    "background-color": "#fff",
  });
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
        console.log(x,+ ":" +link)
        
    }  
    else{
        var link=names[x]
    }

    if (x!=y){
        var mySound=soundManager.createSound({

            url: link,
            onfinish: function(){
                console.log('finished playing audio file '+x);

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


// - Same function as initSLDB except this function initializes the database that contains all of the stories
//   the user has created. As such the object stores that are created on the onupgradeneeded function are different
// - There are two different initiliaze db functions since they need different object stores when they are created
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


//Delete record in objectStore of db by id
function deletes(db,storeName,id){
    return new Promise(function(resolve,reject){
        var tempID=parseInt(id);
        var transaction=db.transaction([storeName],"readwrite");
        var objectStore=transaction.objectStore(storeName);


        //Same intial process as the get function. Create a transaction, specifiy and object store, create a request
        //on the object store and use success/failure handlers when needed
        var request=objectStore.delete(tempID);

        request.onsuccess=function(e){
            console.log("Id deleted in "+storeName+": "+id);
            resolve();
        };
    });
}

//Adds a sound to the db in the Sounds object store
//Returns the id of the sound in the object store to be added to the path of the current story
function addSound(db,newSound){
    return new Promise(function(resolve,reject){
        var transaction=db.transaction(["Sounds"],"readwrite");
        var objectStore=transaction.objectStore("Sounds");
        var request=objectStore.add({Blobs:newSound});
        request.onsuccess=function(e){
            console.log("New Sound has been added");
            resolve(request.result);
        };
    });
}

//Adds an entire new story to the db in the Stories object store
//Stories are represented as JSON files
function addStory(db){
    return new Promise(function(resolve,reject){
        var transaction=db.transaction(["Stories"],"readwrite");
        var objectStore=transaction.objectStore("Stories");
        curJSON={"Title": "", "Author": "", "dateCreated": "", "Path":[]}
        var request=objectStore.add(curJSON);

        //If the creation was successful then return the id of the story that was created 
        request.onsuccess=function(e){
            console.log("New Story has been created");
            curJSON.id=request.result
            resolve(request.result);
        };
        request.onerror=function(){
            console.log("Error has occured creating the story");
            reject();
        };
        request.onblocked=function(){
            console.log("New story creation was blocked");
            reject();
        };

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

//Simply push a new sound id onto the current story path when a new sound has been created/added
function updateStoryPath(id){
    curJSON.Path.push(id)            
}

//Saves the current story path into the Stories object store
function save(db){
    return new Promise(function(resolve,reject){
        // - if the current story is not in the database yet, we create a new story and return set currentStoryID to the
        //   id of the story that has not been created yet
        // - currentStoryID is null if the story is not in the database
        
        if(currentStoryID==null){
            var transaction=db.transaction(["Stories"],"readwrite");
            var objectStore=transaction.objectStore("Stories");
            console.log(curJSON)
            var request=objectStore.add(curJSON);
            request.onsuccess=function(e){
                console.log("Story has been created and saved");
                currentStoryID=request.result;
                if(readCookie("StoryID")==null){
                    createCookie("StoryID",request.result)
                }
                resolve(request.result);
            };
            request.onerror=function(error){
                console.log("Story failed to create: "+error)
                reject();
            };
        }
        //if the current story already exists in the database we update it instead of creating a new story
        else{
            tempJSON=curJSON
            tempJSON.id=currentStoryID
            var transaction = db.transaction(["Stories"],"readwrite");
            var objectStore = transaction.objectStore("Stories");

            //Cursors are a way of traversing the records in a given object store
            //var request = objectStore.openCursor();

            transaction.oncomplete = function(){
                resolve();
            }
            //When the cursor is successfully created it means there are records left in the database to look through
            /*request.onsuccess = function(evt) {
                var cursor = evt.target.result;
                
                // - if the cursor is successful (there are still records left) check the key of the cursor to see if 
                //   it matches the id of our current story
                // - if it does we update the path and if it doesn't we continue onto the 
                //   next record using cursor.continue();
                if (cursor) {
                    if(parseInt(cursor.key)==parseInt(currentStoryID)){
                        cursor.value.Path=curJSON.Path
                        cursor.update(cursor.value)
                        console.log("Story has been updated");
                    }
                    
                    else{
                        cursor.continue();
                    }
                    
                }
                
            }*/
            objectStore.put(tempJSON);
        }
    });
}

//Get the length of the current story
function findStoryLength(db){
  if(currentStoryID==null){
    return curJSON.Path.length-1;
  }
  else{
    get(db,"Stories",currentStoryID).then(function(Story){
        return Story.Path.length-1;
    });
  }
}

function parsePath(db){
    return new Promise(function(resolve,reject){
        console.log(currentStoryID);
        get(db,"Stories",currentStoryID).then(function(Story){
            resolve(Story.Path);
        }, function(){
            console.log("Error with Parsing")
        });
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
    return Promise.all(temp);
       
}

function switchStories(db){
    return new Promise(function(resolve,reject){
        var id = parseInt(document.getElementById("storyID").value);
        var transaction = db.transaction(["Stories"],"readonly");
        var objectStore = transaction.objectStore("Stories");
        var request=objectStore.get(id);
        request.onsuccess=function(e){
            currentStoryID=id;
            console.log("Story switched");
            get(db,"Stories",currentStoryID).then(function(stuff){
                resolve(stuff.result);
            });
            
        };
        request.onerror=function(e){
            console.log("Switch was unsuccessful");
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

//Returns the duration of a sound given its audio blob
function getDuration(aBlob){
    return new Promise(function(resolve,reject){
        var dur=0;
        soundManager.setup({
            url:'C:/soundManager/swf/',

            onready: function(){

            },

            ontimeout: function(){

            }
        });

        if(aBlob instanceof Blob){
            var link=window.URL.createObjectURL(aBlob)
        }  
        else{
            var link=aBlob
        }
        var mySound=soundManager.createSound({
            url: link,
            onload: function(){
                resolve(this.duration);
            }
        })
        mySound.load();
    });
    
}

//Populate the sound list with all the sound durations
function populateList(db){
    return new Promise(function(resolve,reject){
        $('#soundList').empty();
        getBlobs(db).then(function(soundBlobs){
            for(x=0;x<soundBlobs.length;x++){
                var temp=soundBlobs[x]
                if(!((temp instanceof String) || (typeof temp==="string"))){
                    temp=temp.result.Blobs
                }
                getDuration(temp).then(function(duration){
                    $('#soundList').append('<li>'+ Math.floor(duration/1000)+"."+duration%1000+"s")
                });  
            }
            resolve();
        });
    });
    
}

//return the number of items in the category objectstore
function countDB(db){
    return new Promise(function(resolve,reject){
        var transaction = db.transaction(['Categories'], 'readonly');
        var objectStore = transaction.objectStore('Categories');
            
        var countRequest = objectStore.count();
        countRequest.onsuccess = function() {
          resolve(countRequest.result);
        }
    });
}

function transferBlobs(blobs){
    temp=[]
    return new Promise(function(resolve,reject){
        for(x=0;x<blobs.length;x++){
            var temp2 = blobs[x]
            if(!((temp2 instanceof String) || (typeof temp2==="string"))){
                temp2 = temp2.result.Blobs
            }
            temp[x] = temp2
        }
        resolve(temp)
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



//Implementation of the audio recorder
navigator.getUserMedia({audio:true}, onMediaSuccess, onMediaError);



function onMediaSuccess(stream) {
    

  //Getting all of the information for the sound library from a txt file
    
  var mediaRecorder = new MediaStreamRecorder(stream);
  console.log("Mediarecorder on");
  mediaRecorder.mimeType = 'audio/ogg';

  //If the SoundLibrary has nothing in it then create the Sound Library
  initSLDB("SoundLibrary").then(function(db){
      countDB(db).then(function(count){
          if(count==0){
              getLibraryMenu().then(function(){
                  for(var q=0;q<categoriesArray.length;q++){
                      addCategory(db,categoriesArray[q],libPaths[q])
                      $('#soundLibrary').append('<li>'+ categoriesArray[q])
                  }
              });  
          }
          else{
              getLibraryMenu().then(function(){

                  for(var w=0;w<categoriesArray.length;w++){

                      $('#soundLibrary').append('<li>'+ categoriesArray[w])
                  }
              });
          }
      });
      
  });
  

  //Initialize the current story to be empty upon opening 
  
    readCookie("StoryID").then(function(data){
        if(data!=null){
            currentStoryID=data
            console.log("Cookie:",data)
            initDB("SamiSays").then(function(db){
                get(db,"Stories",data).then(function(newJSON){
                    curJSON=newJSON.result;
                    populateList(db)
                    voiceReady().then(function(){
                        speak(NaviBarInstructions)
                    });
                });
            });
        }
        else{
            voiceReady().then(function(){
                speak("Hold down the space bar to make a name for your story")
            });
            
            current_mode="Record"
            $('#myCarousel').carousel(0);
            addFocus();
        }
    });


  mediaRecorder.ondataavailable = function (blob) {
      if(currentStoryID!=null){
        getDuration(blob).then(function(duration){
            $('#soundList').append('<li>'+ Math.floor(duration/1000)+"."+duration%1000+"s")
        });
      }
      
      //When a new sound is recorded insert the sound into the current Path and then append the duration to the soundList
      initDB("SamiSays").then(function(db){
          addSound(db,blob).then(function(sid){
              console.log("CurID: "+currentStoryID);
              if(currentStoryID==null){
                curJSON.Title=sid
                save(db).then(function(newID){
                    currentStoryID=newID
                });
              }
              else{
                updateStoryPath(sid);
                save(db)
                
              }
          });
      });
  };


  //Keyboard commands
  //-----------------
  var chosenTemp;
  var is_moving=false;
  var moving_id=null;

  //Hold down the spacebar to record
  $(document).on('keydown', function(e) {
      stopSound()
      if(current_mode=="Record"){
          if (e.keyCode == 32 && !recording) {
              recording = true;
              document.getElementById('is_recording').src = "Images/Record_On.png";
              console.log('recording');
              mediaRecorder.start(10000);
          }
      }
      
  });

  $(document).on('keyup', function(e) {
    
    
      //Only allow the user to move around in the navigation bar as long as they havent chosen an action
      if(current_mode=="NaviBar"){ //&& is_Playing==false){
          
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
              else if((chosen+1)==NaviBarText.length){
                  playErrorSound();
              }
          }

          //Press left to switch focus
          else if(e.keyCode == 37){
              if (chosen === "none"){
                  chosen=0;
                  speak(NaviBarText[chosen])
                  $('#NaviBar li').removeClass('NaviSelected');
                  $('#NaviBar li:eq('+chosen+')').addClass('NaviSelected');
              }
              else if((chosen-1) >= 0){
                  chosen--;
                  speak(NaviBarText[chosen])
                  $('#NaviBar li').removeClass('NaviSelected');
                  $('#NaviBar li:eq('+chosen+')').addClass('NaviSelected');
              }
              else if((chosen-1) < 0){
                  playErrorSound();
              }
              
          }

        //Execute the appropriate action when an action from the navigation bar is selected
        else if(e.keyCode == 40 && chosen!="none"){
            if(NaviBarText[chosen]=="Go back to Main Menu"){
                  window.location.replace("SamiSays_MainMenu.html")
                  if(currentStoryID!=null){
                        eraseCookie("StoryID")
                        createCookie("StoryID",currentStoryID)
                  }
              
            }
            else if(NaviBarText[chosen]=="Add a Sound"){
              addFocus();
              current_mode=ActionDict[NaviBarText[chosen]]
              console.log(current_mode)
              $('#myCarousel').carousel(1);
              //Reset the chosen variable for the sound library
              chosenTemp=chosen
              chosen="none"
              speak("Use the left and right arrows to choose between different types of sounds. Press down when you find a type of sound you want to listen to. And press up if you want to do something else")
              
            }
            else if(NaviBarText[chosen]=="Change your Story"){
                if(curJSON.Path.length>1){
                      addFocus();
                      current_mode=ActionDict[NaviBarText[chosen]]
                      console.log(current_mode)
                      $('#myCarousel').carousel(2);
                      chosenTemp=chosen
                      chosen="none"
                      sBlobs=[]
                      speak("Press left and right to move between sounds and press down to delete a sound. You can pick two sounds using the spacebar and switch them. If you want to do something else press up")  
                      initDB("SamiSays").then(function(db){
                          getBlobs(db).then(function(soundBlobs){
                              for(x=0;x<soundBlobs.length;x++){
                                  var temp=soundBlobs[x]
                                  console.log(temp)
                                  if(!((temp instanceof String) || (typeof temp==="string"))){
                                      temp=temp.result.Blobs
                                  }
                                  sBlobs[x]=temp
                              }
                          });
                      });
                }
                else if(curJSON.Path.length==0){
                    speak("You have not made or added any sounds to your story yet!")
                }
                else{
                    speak("You only have one sound in your story! Make or add more sounds before you can change your story")
                }
              
            }
            else if(NaviBarText[chosen]=="Make a Sound"){
              addFocus();
              current_mode=ActionDict[NaviBarText[chosen]]
              console.log(current_mode)
              $('#myCarousel').carousel(0);
              speak("Hold the space bar to make a sound for your story and press up if you want to do something else")
            }
            else{
              current_mode=ActionDict[NaviBarText[chosen]]
              //console.log(current_mode)
            }
            //Playback the story when the Listen to your Story action has been chosen
            if(current_mode=="Playback"){
              if(curJSON.Path.length!=0){
                initDB("SamiSays").then(function(db){
                    getBlobs(db).then(function(soundBlobs){
                        is_Playing = true;
                        //console.log(soundBlobs)
                        transferBlobs(soundBlobs).then(function(newblobs){
                            playList(0,newblobs.length,newblobs)
                            console.log(newblobs)
                            current_mode="NaviBar"
                        });
                        
                        
                    });
                });
              }
              else{
                speak("There are no sounds in your story. Add or make sounds for your story to listen to them")
                current_mode="NaviBar"
              }
            }
        }
        //Play error sound when a key is pressed that doesnt do anything
        else{
            playErrorSound();
        }
      }

      //RECORD MODE
      else if(current_mode=="Record"){
        //Press up to go back into the navigation bar
        if(e.keyCode==38 && currentStoryID!=null){
          removeFocus();
          current_mode="NaviBar"
          speak(NaviBarInstructions)
        }

        //When the spacebar is released set recording to false
        else if (e.keyCode == 32 && recording && current_mode=="Record") {
          recording = false;
          document.getElementById('is_recording').src = "Images/Record_Off.png";
          //console.log('stop', e);
          console.log('Done Recording');
          if(currentStoryID!=null){
            speak("You have made a sound for your story. Hold down the space bar again to make another sound or press up if you want to do something else")
          }
          else{
            speak("You have created a new story!" + NaviBarInstructions)
            removeFocus();
            current_mode="NaviBar"
            speak(NaviBarInstructions)
          }
          mediaRecorder.stop();
        }
        else{
            playErrorSound();
        }
        
      }

      //EDIT MODE
      else if(current_mode=="Edit"){
          //Return to Navigation bar
          if(e.keyCode == 38){
              $('#soundList li').removeClass('selected');
              $('#soundList li').removeClass('move_selected');
              chosen=chosenTemp
              is_moving=false;
              moving_id=null;
              removeFocus();
              current_mode="NaviBar"
              speak(NaviBarInstructions)
          }

          //Press left to switch focus
          else if(e.keyCode == 37){
              if (chosen === "none"){
                  chosen=0;
                  soundManager.stopAll();
                  playSound(sBlobs[chosen])
              }
              else if((chosen-1) >= 0){
                  chosen--;
                  soundManager.stopAll();
                  playSound(sBlobs[chosen])
              }
              /*else if((chosen-1) < 0){
                  chosen=curJSON.Path.length-1
                  playSound(sBlobs[chosen])
              }*/
              $('#soundList li').removeClass('selected');
              $('#soundList li:eq('+chosen+')').addClass('selected');
          }

          //Press right to switch focus
          else if(e.keyCode == 39){
              if (chosen === "none"){
                  chosen=0;
                  soundManager.stopAll();
                  playSound(sBlobs[chosen])
              }
              else if((chosen+1) < curJSON.Path.length){
                  chosen++;
                  soundManager.stopAll();
                  playSound(sBlobs[chosen])
              }
              /*else if((chosen+1) == curJSON.Path.length){
                  chosen = 0;
                  playSound(sBlobs[chosen])
              }*/
              $('#soundList li').removeClass('selected');
              $('#soundList li:eq('+chosen+')').addClass('selected');
          }

          //Press down to delete a sound
          else if(e.keyCode == 40){
              if(chosen === "none"){
                  speak("You have not chosen a sound yet")
              }
              else{
                soundManager.stopAll()
                  speak("The sound has been deleted and you have been moved back to the beginning of the story. Press left and right to move between sounds and press down to delete a sound. You can pick two sounds using the spacebar and switch them. If you want to do something else press up")
                  curJSON.Path.splice(chosen,1);
                  sBlobs.splice(chosen,1)
                  initDB("SamiSays").then(function(db){
                      populateList(db)
                      
                      if(currentStoryID==null){
                            save(db).then(function(newID){
                                currentStoryID=newID
                            });
                      }
                      else{
                            save(db)
                      }
                   
                  });
                  chosen='none'

              }
          }

          //Press space to select sound to be moved around
          else if(e.keyCode == 32){
              if(chosen === "none"){
                  speak("You have not chosen a sound yet")
              }
              else{
                  if(is_moving==false){
                      moving_id=chosen;
                      is_moving=true;
                      $('#soundList li').removeClass('selected');
                      $('#soundList li:eq('+chosen+')').addClass('move_selected');
                      speak("Sound selected. Choose another sound and press space to switch the sounds")
                  }
                  else if(is_moving==true && moving_id==chosen){
                      moving_id=null;
                      is_moving=false;
                      $('#soundList li').removeClass('move_selected');
                      speak("Sound unselected")
                  }
                  else if(moving_id!=chosen){
                      soundManager.stopAll();
                      
                      temp=curJSON.Path[moving_id];
                      curJSON.Path[moving_id]=curJSON.Path[chosen];
                      curJSON[chosen]=temp
                      temp=sBlobs[moving_id];
                      sBlobs[moving_id]=sBlobs[chosen];
                      sBlobs[chosen]=temp

                      initDB("SamiSays").then(function(db){
                          populateList(db)
                          if(currentStoryID==null){
                                save(db).then(function(newID){
                                    currentStoryID=newID
                                });
                          }
                          else{
                                save(db)
                          }
                      });
                      moving_id=null;
                      is_moving=false;
                      chosen='none'
                      speak("The two sounds have been switched and you have been moved back to the beginning of the story")
                      

                  }
              }
          }
          else{
            playErrorSound();
          }

      }

      //SOUND LIBRARY MODE
      else if(current_mode=="Sound_Library"){

          //Press right to switch focus
          if(e.keyCode == 39){
            if (chosen === "none"){
                chosen=0;
            }
            else if((chosen+1) < categoriesArray.length && curCategory==="none"){
                chosen++;       
            }
            else if(curCategory!="none" && (chosen+1) < libPaths[categoriesArray.indexOf(curCategory)].length){
                chosen++;
            }
            else if((curCategory == "none") && ((chosen+1)==categoriesArray.length)){
                chosen=0;
            }
            else if((curCategory != "none") && ((chosen+1)==libPaths[categoriesArray.indexOf(curCategory)].length)){
                chosen=0;
            }

            if(curCategory=="none"){
                speak(categoriesArray[chosen])
            }
            else{
                soundManager.stopAll();
                playSound("sound_library/"+curCategory+"/"+libPaths[categoriesArray.indexOf(curCategory)][chosen])
            }
            $('#soundLibrary li').removeClass('selected');
            $('#soundLibrary li:eq('+chosen+')').addClass('selected');
            /*if(curCategory===""){
                speak(categoriesArray[chosen])
            }
            else{
                soundManager.stopAll();
                playSound("sound_library/"+curCategory+"/"+libPaths[categoriesArray.indexOf(curCategory)][chosen])
            }*/
        }

        //Press left to switch focus
        else if(e.keyCode == 37){
            if (chosen === "none"){
                chosen=0;              
            }
            else if((chosen-1) >= 0){
                chosen--;
            }
            else if((curCategory == "none") && ((chosen-1)<0)){
                chosen=categoriesArray.length-1;
            }
            else if((curCategory != "none") && ((chosen-1)<0)){
                chosen=libPaths[categoriesArray.indexOf(curCategory)].length-1;
            }


            if(curCategory=="none"){
                speak(categoriesArray[chosen])
            }
            else{
                soundManager.stopAll();
                playSound("sound_library/"+curCategory+"/"+libPaths[categoriesArray.indexOf(curCategory)][chosen])
            }
            $('#soundLibrary li').removeClass('selected');
            $('#soundLibrary li:eq('+chosen+')').addClass('selected');
            /*if(curCategory===""){
                speak(categoriesArray[chosen])
            }
            else{
                soundManager.stopAll();
                playSound("sound_library/"+curCategory+"/"+libPaths[categoriesArray.indexOf(curCategory)][chosen])
            }*/
            
        }

        //up arrow key
        else if(e.keyCode==38){
            //Press up to move back into the navigation bar
            if(curCategory=="none"){
              removeFocus();
              $('#soundLibrary li').removeClass('selected');
              current_mode="NaviBar"
              chosen=chosenTemp
              stopSound()
              speak(NaviBarInstructions)
            }
            //Press up to move back into the sound library if the user is already in a category
            else{
              $('#soundLibrary').empty()
              for(var e=0;e<categoriesArray.length;e++){
                  $('#soundLibrary').append("<li>"+categoriesArray[e])
              }
              chosen="none"
              curCategory="none"
              stopSound()
              speak("Use the left and right arrows to choose between different types of sounds. Press down when you find a type of sound you want to listen to. And press up if you want to do something else")
            }
        }

        //Down arrow key
        else if(e.keyCode==40){
            if(curCategory=="none" && chosen != "none"){
              $('#soundLibrary li').removeClass('selected');
              curCategory=categoriesArray[chosen]
              console.log(curCategory)
              //speak("You are now in the "+curCategory+" category. Press up and down to move between sounds, press space to add them to your story, and press left to go back to the sound library")
              chosen="none"
              $('#soundLibrary').empty()

              for(var e=0;e<libPaths[categoriesArray.indexOf(curCategory)].length;e++){
                  $('#soundLibrary').append("<li>"+libPaths[categoriesArray.indexOf(curCategory)][e])
              }
              speak("Use the left and right arrows to listen to the different sounds. And press the down arrow when you find a sound you want to add to your story. You can press up to pick a different type of sound")
            }
            //Add sound to story
            else{
                if(chosen==="none"){
                    speak("You have not selected a sound yet")
                }
                else{

                    speak("The sound has been added to your story")
                    var tempLink=("sound_library/"+curCategory+"/"+libPaths[categoriesArray.indexOf(curCategory)][chosen])
                    curJSON.Path.push(tempLink)
                    getDuration(tempLink).then(function(duration){
                        $('#soundList').append('<li>'+ Math.floor(duration/1000)+"."+duration%1000+"s")
                    });
                    initDB("SamiSays").then(function(db){
                        if(currentStoryID==null){
                            save(db).then(function(newID){
                                currentStoryID=newID
                            });
                        }
                        else{
                            save(db)
                        }
                    });
                }
            }
        }
        else{
            playErrorSound();
        }
      }
  });

}

function onMediaError(e) {
    console.error('media error', e);
}