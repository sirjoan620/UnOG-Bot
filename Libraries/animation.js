const fs = require("fs");
let Animations = JSON.parse(fs.readFileSync('./Libraries/Storage/Animations.json', 'utf8'));

var animatedMessages = new Array();
var animationLoopCount = 3;

//Hareketli mesajı oluşturup arraya ekleyen ana fonksiyon, animation parametresi teker teker kareleri içeren bir string arrayi
function SetupAnimatedMessage(channel, animation)
{
	channel.send(animation[0]).then(msg =>SetAnimatedMessage(msg,animation));
}

function SetAnimatedMessage(msg, animation)
{
	var newAnimatedMessage = new AnimatedMessage(msg, animation);
	animatedMessages.push(newAnimatedMessage);
	console.log("Set up a new animated message.");
}

class AnimatedMessage
{
	constructor(message, animation, sleepTime = 200)
	{
		this.animationArray = animation;
		this.message = message;
		this.sleepTime = sleepTime;
		
		this.currentFrame = 0;
		this.stepping = false;
		this.lastStepTime = 0;
		this.loopCount = 0;
	}

	GetFrame()
	{
		return this.animationArray[this.currentFrame];
	}
}

//Bir sonraki kareye geç
AnimatedMessage.prototype.Step = function Step()
{	
	this.currentFrame += 1;
	if(this.currentFrame >= this.animationArray.length)
	{
		this.currentFrame -= this.animationArray.length;
		this.loopCount += 1;
	}
	if(this.loopCount >= animationLoopCount)
	{
		return;
	}
	this.stepping = true;
	this.message.edit(this.GetFrame()).then( ()=> 
	{
		this.stepping = false;
		this.lastStepTime = Date.now();
	});
}

//Hareketli mesajlar arrayine bak ve kare atlaması gerekenlere kare atlat. Mesaj karesinin en az sleepTime kadar görüldüğünden emin olur.
function ProcessAnimatedMessages()
{
	var i = animatedMessages.length;
	while (i--)
	{
		if(animatedMessages[i].loopCount >= animationLoopCount)
		{
			animatedMessages.splice(i,1);
		}
		else if(!animatedMessages[i].stepping)
		{
			if(Date.now() - animatedMessages[i].lastStepTime > animatedMessages[i].sleepTime)
			{
				animatedMessages[i].Step();
			}		
		}		
	}
}

//Tüm animasyon komutlarını değerlendiren fonksiyon
function ProcessAnimationCommand(message)
{
	let messageSplit = message.content.split(" ");
	if(messageSplit[1] === "create")
	{
		let animationName = messageSplit[2];

		if(Animations.hasOwnProperty(animationName))
		{
			message.channel.send("Animation already exists.");
		}
		else
		{
			Animations[animationName] = {};
			Animations[animationName].owner = message.author.id;
			Animations[animationName].animationData = [];
			fs.writeFile('./Animations.json', JSON.stringify(Animations), console.error);	

			message.channel.send(`Created animation **${animationName}** succesfully.`);
			return;
		}
	}
	else if(messageSplit[1] === "edit")
	{
		let animationName = messageSplit[2];
		if(Animations.hasOwnProperty(animationName))
		{
			if(messageSplit.length >= 4)
			{				
				if(Animations[animationName].owner == message.author.id)
				{
					let frameNumber = messageSplit[3];
					let stringLength = messageSplit[3].length;

					if(frameNumber == "add")
					{
						var substringID = 21 + animationName.length;
						var frameData = message.content.substring(substringID);

						Animations[animationName].animationData.push(frameData);
						fs.writeFile('./Animations.json', JSON.stringify(Animations), console.error);	
						message.channel.send("Added frame succesfully.");
						return;
					}
					if(frameNumber == "addMultiple")
					{
						var substringID = 29 + animationName.length;
						var frameData = message.content.substring(substringID);
						var frames = frameData.split(";");

						for (var i = 0; i < frames.length; i++)
						{
							Animations[animationName].animationData.push(frames[i]);
						}
						fs.writeFile('./Animations.json', JSON.stringify(Animations), console.error);
						message.channel.send("Added frames succesfully.");
						return;
					}
					else
					{
						if(!isNaN(frameNumber) && frameNumber != 0)
						{
							if(Animations[animationName].animationData.length >= frameNumber)
							{
								var substringID = 18 + animationName.length + stringLength;
								var frameData = message.content.substring(substringID);
								Animations[animationName].animationData[frameNumber - 1] = frameData;
								fs.writeFile('./Animations.json', JSON.stringify(Animations), console.error);
								message.channel.send("Edited frame succesfully.");
								return;
							}
							else
							{
								message.channel.send(`Animation does not have frame **${frameNumber}**.`);
								return;
							}
						}
						else
						{
							message.channel.send("Incorrect number.");
							return;
						}
					}
				}
				else
				{
					message.channel.send("You do not own this animation.");
					return
				}
			}
			else
			{
				message.channel.send("You didnt specify editing parameters.");
			}
		}
		else
		{
			message.channel.send("Animation not found.");
			return;
		}
	}
	else if(messageSplit[1] === "play")
	{
		let animationName = messageSplit[2];
		if(Animations.hasOwnProperty(animationName))
		{
			SetupAnimatedMessage(message.channel, Animations[animationName].animationData);
			//message.delete();
		}
		else
		{
			message.channel.send("Animation not found.");
		}
	}
	else if(messageSplit[1] === "info")
	{
		let animationName = messageSplit[2];
		if(Animations.hasOwnProperty(animationName))
		{
			var data = Animations[animationName].animationData;
			var dataString = "";

			var finalString = `-`
			
			for (var i = 0; i < data.length; i++)
			{
				var element = data[i];
				finalString += `\n**[Frame ${i+1}]**\n-\n${data[i]}\n-`;
			}

			message.channel.send(finalString);
		}
		else
		{
			message.channel.send("Animation not found.");
		}		
	}
	else if(messageSplit[1] === "help")
	{
		var helpMessage = "**Commands:**\n\n`%animation create animationName:` Creates an animation with the name **animationName.**\n";
		helpMessage += "-\n";
		helpMessage += "`%animation edit animationName add framePicture:` Adds a new frame with the **framePicture** to the animation called **animationName.**\n";
		helpMessage += "-\n";
		helpMessage += "`%animation edit animationName addMultiple frame1;frame2;frame3...:` Adds frames seperated with **;** to the animation called **animationName.**\n";
		helpMessage += "-\n";
		helpMessage += "`%animation edit animationName frameNumber framePicture:` Edits the animation called **animationName** on the frame **frameNumber.**\n";
		helpMessage += "-\n";
		helpMessage += "`%animation info animationName:` Displays the frames of the animation **animationName.**\n";
		helpMessage += "-\n";
		helpMessage += "`%animation play animationName:` Plays the animation called **animationName.**\n";
		helpMessage += "-\n";
		helpMessage += "`%animation list:` Lists all the animations.";

		message.channel.send(helpMessage);
	}
	else if(messageSplit[1] === "list")
	{
		var keys = Object.keys(Animations);
		var messageText = "-";
		for (var i = 0; i < keys.length; i++)
		{
			messageText += "\n"+"**"+keys[i]+"**";
		}

		messageText += "\n-\nYou can do `%animation play animationName` to play animations.";
		message.channel.send(messageText);
		return;
	}
	else if(messageSplit[1] === "delete")
	{
		let animationName = messageSplit[2];
		if(Animations.hasOwnProperty(animationName))
		{
			if(Animations[animationName].owner == message.author.id)
			{
				delete Animations[animationName];
				fs.writeFile('./Animations.json', JSON.stringify(Animations), console.error);
				message.channel.send("Animation removed succesfully.");
				return;
			}
			else
			{
				message.channel.send("Only the owner can remove this animation.");
				return;
			}
		}
		else
		{
			message.channel.send("Animation not found.");
		}		
	}
	else
	{
		message.channel.send("Command not found.");
		return;
	}
}

exports.ProcessAnimatedMessages = ProcessAnimatedMessages;
exports.ProcessAnimationCommand =  ProcessAnimationCommand;
exports.animatedMessages = animatedMessages;
exports.animationLoopCount = animationLoopCount;
