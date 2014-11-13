// Globals
var psiTurk = PsiTurk(uniqueId, adServerLoc);
var expCondition = condition; //from exp.html script
console.log("Exp. Condition" + expCondition);
var audioManager = new AudioManager();
var results = [];

//config
audioManager.pathPrefix = "/static/stimuli/";

//stages

var reqLoaded = function(loaders, callback){
	
	var isLoaded = true;
	var total = 0;
	var counts = [];
	var updateProg = function() {
		var prog = 0;
		counts.forEach(function(count){ prog += count; });
		//update dat prog bar with prog/total *100 %
		percProg = Math.round(prog/total*100) + "%";
		$("#loadingWrapper .progress-bar").width(percProg).text(percProg);
		if (prog == total) cleanUp();
	};

	var cleanUp = function() {
		//delete our modal
		$("#loadingWrapper").fadeOut(200, function(){
			$(this).remove();
			callback();
		});
		//TODO: remove our listeners
	};

	var setupEvent = function(i) {
		window.addEventListener(loaders[i].eventName, function(e){
			//attempt to keep the counts updated
			counts[i] = e.detail;
			updateProg();
		});
	};

	for (var i = 0; i < loaders.length; i++) {
		if (loaders[i].getCount() != loaders[i].total) {
			isLoaded = false;
			//once we find one, we don't need to iterate any more
			break;
		}
	}

	if (isLoaded) {
		callback();
	} else {

		//throw up a modal
		$("body").append('<div class="noticeModalWrapper" id="loadingWrapper"><div class="noticeModal loading well"><h3>Loading...</h3><div class="progress"> \
			<div class="progress-bar" role="progressbar" style="width: 0%; transition: none;"> \
			0% \
			</div> \
			</div></div></div>');

		//do some prep
		for (var i = 0; i < loaders.length; i++){
			total += loaders[i].total;
			counts.push(loaders[i].getCount());
			setupEvent(i);
		}

		//update a loading bar using an event handler
		updateProg();
	}

};

var ldtTrials = function(stimList, numTrials, recordData, callback) {

	window.keypressed = {};
	var trialcounter = 0;
	var stims = _.shuffle(_.keys(stimList));
	var curStimStartTime;
	var curStimStartTimeDate;
	var stim;
	var listening = false;

	var nextStim = function() {
		if (trialcounter == numTrials) cleanup();
		else {
			stim = stims[0];
			listening = false;
			window.setTimeout(function(){
				curStimStartTimeDate = (new Date).getTime()/1000;
				curStimStartTime = audioManager.play(stim, null);
				listening = true;
			}, 250);//ISI
			trialcounter++;
		}
	};


	var response_handler = function(e) {
		if ( window.keypressed[e.which] ) e.preventDefault();
		else {
			e.preventDefault();
			if (listening){
				var responseTime = audioManager.now();
				var responseTimeDate = (new Date).getTime()/1000;
				var response;

				response = 'nonWord';
				$(".tab").addClass("kbd-down");

				//record response
				if (trialcounter !=0) {
					trial = trialcounter;
					rnxt = (responseTime - curStimStartTime);
					rnxtDate = (responseTimeDate - curStimStartTimeDate);
					results.push({"trial":trial, "RT": rnxt});
					$("#results").append("<tr><td>"+trial+"</td><td>"+rnxt+"</td><td>"+rnxtDate+"</td></tr>")
				}

				//go next
				nextStim();
			}
			window.keypressed[e.which] = true;
		}		
	};

	var cleanup = function() {
		shyCursor.off();
		$("body").off(".ldt");
		callback();
	}

	shyCursor.on();

	// Load the stage.html snippet into the body of the page
	psiTurk.showPage('ldtStage.html');

	$("body").focus().on("keyup.ldt",response_handler);
	$("body").focus().on("keydown.ldt",function(e){
		window.keypressed[e.which] = false;
		if (e.keyCode == 9) $(".tab").removeClass("kbd-down");
		else if (e.keyCode == 220) $(".backslash").removeClass("kbd-down");
	});

	// Start the test
	// nextStim();
	listening = true;
};


/***************
Preload
***************/

// manually set condition
// var expCondition = 0;

//funnel safari to LDT
if (isSafari()) expCondition = 1;

psiTurk.preloadPages([
	"instructions/ldtPretrial.html",
	"ldtStage.html",
]);
var ldtLoaders = {
	words 	: audioManager.preloadSounds(wordStims, "word"),
};

/***********
Run
*************/

$(window).load( function(){

	//for readability
	$(document)
	.queue(function(next){  reqLoaded([ldtLoaders.words],		next);})
	.queue(function(next){  ldtTrials(wordStims,10,true, function(){console.log("hi")});})
});