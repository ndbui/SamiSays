//var ActionDict={"Listen to your Story":"Record","Add a Sound":"Sound_Library","Listen to your story":"Playback","Change your Story":"Edit"}
var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.msIndexedDB;
var IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction;
var db;
var is_Playing=false;
var currentStoryID=null;
var curJSON={"Title": "", "Author": "", "dateCreated": "", "Path":[]};
var chosen = "none"
var NaviBarText=["Listen to your Story","Delete this Story","Change your Story","Pick a Different Story","Go back to Main Menu"]
var storyIdArray=[]
var sBlobs=[]
var currentSpeech=new SpeechSynthesisUtterance();
var inStories=true
var NaviBarInstructions="What would you like to do. Use the left and right arrows to listen to your options and press the down arrow to choose what you want to do"
var StorySelection="Which story do you want. Press up to go back to the main menu. Press down to choose a story and press left and right to move from story to story"



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

//Delete record in objectStore of db by id
function deletes(db,storeName,id){
    return new Promise(function(resolve,reject){
        var tempID=parseInt(id);
        var transaction=db.transaction([storeName],"readwrite");
        var objectStore=transaction.objectStore(storeName);



        var request=objectStore.delete(tempID);

        request.onsuccess=function(e){
            console.log("Id deleted in "+storeName+": "+id);
            resolve();
        };
    });
}

//return the number of items in the Stories objectstore
function countDB(db){
    return new Promise(function(resolve,reject){
        var transaction = db.transaction(['Stories'], 'readonly');
        var objectStore = transaction.objectStore('Stories');
            
        var countRequest = objectStore.count();
        countRequest.onsuccess = function() {
          resolve(countRequest.result);
        }
    });
}

//Switch the current story to the desired story with id:newID if it exists and returns the JSON of the new story
function switchStories(db,newID){
    return new Promise(function(resolve,reject){
        var id = parseInt(newID);
        
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

function getTitleBlob(db,ID){
    return new Promise(function(resolve,reject){
        get(db,"Stories",ID).then(function(stuff){
            console.log("Sound ID: "+stuff.result.Title)
            get(db,"Sounds",stuff.result.Title).then(function(moreStuff){
                resolve(moreStuff.result.Blobs)
            });
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
    console.log(temp)
    return Promise.all(temp);
       
}


//Fill the storyList with stories that have been created
function populateList(db){
    return new Promise(function(resolve,reject){
        $('#storyList').empty();
        storyIdArray=[]
        var transaction = db.transaction(['Stories'],'readonly');
        var objectStore = transaction.objectStore('Stories');

        var request = objectStore.openCursor();
        request.onsuccess = function(evt) {
            var cursor = evt.target.result;
            if (cursor) {
                $('#storyList').append('<li>'+ cursor.key)
                storyIdArray.push(cursor.key)
                cursor.continue();   
            }
        }

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

//If a story has been selected in either the Main Menu or the Story mode get the id
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


//Populate the storyList
initDB("SamiSays").then(function(db){
	populateList(db)
});

//Save the location of the selected story
var chosenTemp;


voiceReady().then(function(){
    speak(NaviBarInstructions)
});

$(document).on('keyup', function(e) {
	//If a story has not been chosen yet we start inside the carousel and chose a story among all the stories that have been created
	if(inStories==true){
		//Press right to switch focus
	    if(e.keyCode == 39){
	        if (chosen === "none"){
	            chosen=0;
	        }
	        else if((chosen+1) < $('#storyList li').length){
	            chosen++;
	        }
            else if(((chosen+1) == $('#storyList li').length) && ($('#storyList li').length!=1)){
                chosen=0;
            }
            

            initDB("SamiSays").then(function(db){
                getTitleBlob(db,storyIdArray[chosen]).then(function(blob){
                    stopSound();
                    playSound(blob);
                });
            });
	        $('#storyList li').removeClass('selected');
	        $('#storyList li:eq('+chosen+')').addClass('selected');
	    }

	    //Press left to switch focus
	    else if(e.keyCode == 37){
	        if (chosen === "none"){
	            chosen=0;
	        }
	        else if(chosen-1 >= 0){
	            chosen--;
	        }
            else if(((chosen-1) < 0)&&($('#storyList li').length!=1)){
                chosen=$('#storyList li').length-1;
            }
	       
            initDB("SamiSays").then(function(db){
                getTitleBlob(db,storyIdArray[chosen]).then(function(blob){
                    stopSound();
                    playSound(blob);
                });
            });
	        $('#storyList li').removeClass('selected');
	        $('#storyList li:eq('+chosen+')').addClass('selected');   
	    }

	    //Execute the appropriate action when an action from the navigation bar is selected (down arrow key)
	    else if(e.keyCode == 40 && chosen!="none"){
	        removeFocus()
	        var temps=storyIdArray[chosen]
	        //Makes sure the desired story id exists and if it does switch current story id to new id
            initDB("SamiSays").then(function(db){
                switchStories(db,temps).then(function(newJSON){            
                    curJSON=newJSON;
                })
            });
        
            inStories=false
            //Remember which story you are on and reset chosen for the navigation bar
	        chosenTemp=chosen
	        chosen="none"
            speak(NaviBarInstructions)

	    }

	    //Return to Main Menu when the up arrow key is pressed
	    else if(e.keyCode == 38){
            if(currentStoryID!=null){
                    readCookie("StoryID").then(function(data){
                        if(data==null){
                            createCookie("StoryID",currentStoryID)
                        }
                        else{
                            eraseCookie("StoryID")
                            createCookie("StoryID",currentStoryID)
                        }
                    });
                }
	    	window.location.replace("SamiSays_MainMenu.html")
            
	    }

        //Play error sound when a key is pressed that doesnt do anything
        else{
            playErrorSound();
        }
	}

	//A story has been selected
	else{ //if(is_Playing==false){
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

	    //Press left to switch focus
	    else if(e.keyCode == 37){
	        if (chosen === "none"){
	            chosen=0;
                speak(NaviBarText[chosen])
                $('#NaviBar li').removeClass('NaviSelected');
                $('#NaviBar li:eq('+chosen+')').addClass('NaviSelected');
	        }
	        else if(chosen > 0){
	            chosen--;
                speak(NaviBarText[chosen])
                $('#NaviBar li').removeClass('NaviSelected');
                $('#NaviBar li:eq('+chosen+')').addClass('NaviSelected');
	        }
            else if(chosen - 1 < 0){
                playErrorSound();
            }
	        
	    }

	    //Press down to select an action
	    else if(e.keyCode == 40 && chosen!="none"){
	    	if(NaviBarText[chosen]=="Pick a Different Story"){
	    		
                initDB("SamiSays").then(function(db){
                    countDB(db).then(function(numStories){
                        if(numStories==1){
                            speak("You have not made any other stories yet!")
                        }
                        else{
                            currentStoryID=null;
                            addFocus();
                            $('#NaviBar li').removeClass('NaviSelected');
                            chosen=chosenTemp
                            inStories=true   
                            speak(StorySelection)
                        }
                    });
                });
	    	}
            else if(NaviBarText[chosen]=="Listen to your Story"){
                if(curJSON.Path.length!=0){
                    initDB("SamiSays").then(function(db){
                        countDB(db)
                        getBlobs(db).then(function(soundBlobs){
                            if(curJSON.Path.length>0){
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
                            }
                            else{
                                speak("There are no sounds in your story!")
                            }
                        });
                    });
                }
            }
            else if(NaviBarText[chosen]=="Delete this Story"){
                initDB("SamiSays").then(function(db){
                    deletes(db,"Stories",currentStoryID).then(function(){
                        countDB(db).then(function(numStories){
                            if(numStories==0){
                                speak("You dont have anymore stories! You are being taken back to the Main Menu")
                                eraseCookie("storyID")
                                window.location.replace("SamiSays_MainMenu")
                            }
                            else{
                                currentStoryID=null
                                chosen="none"
                                addFocus()
                                populateList(db)
                                $('#NaviBar li').removeClass('NaviSelected');
                            }
                        });
                        
                    });
                });
            }
            else if(NaviBarText[chosen]=="Change your Story"){
                if(currentStoryID!=null){
                    readCookie("StoryID").then(function(data){
                        if(data==null){
                            createCookie("StoryID",currentStoryID)
                        }
                        else{
                            eraseCookie("StoryID")
                            createCookie("StoryID",currentStoryID)
                        }
                    });
                }
                window.location.replace("SamiSays_StoryMode.html")
            }
            else{
                if(currentStoryID!=null){
                    readCookie("StoryID").then(function(data){
                        if(data==null){
                            createCookie("StoryID",currentStoryID)
                        }
                        else{
                            eraseCookie("StoryID")
                            createCookie("StoryID",currentStoryID)
                        }
                    });
                }
                window.location.replace("SamiSays_MainMenu.html")
            }
	    }
        //Play error sound when a key is pressed that doesnt do anything
        else{
            playErrorSound();
        }
	}

});