# fmcc
-Introduction-

Football Manager Command Centre

FMCC is a web applicaton developed through using Claude Cowrk AI, that focusses on being a useful tool for any Football Manager players.

Users can plug in stats from their saves to see it displayed, broken down and analysed to try and gain further insight on aspects of the game that can get on top of us sometime.

For steps on how to capture data, import it into the application, and make use of it pleaase take a look at the 'FMCC Setup Guide'

------------

-Features-

Dashboard

Once you have imported your save data into the application, FMCC will create your dashboard which highlghts details on the club you are managing, any club related records, achievements you have earned through your time at the club, and even displays league positions and statistics at the time the data was captured. As well as this, the dashboard has a series of tiles showing output from the various areas of the appliation. These being the 'best players' from your current first team squad, a display of your current in game tactic or one you may have created in the app (more on that later), some areas to focus on within your squad, potentail gaps that in regards to your tactic, and a list of highly recommended players you have scouted.

Squad

Having followed the instructions in the setup guide, you will now have a list of all the players in the first team, including all of their in game stats, this page is more for referencing purposes and is used for further analysis as we delve deeped into the command centre.

Squad Breakdown

The squad breakdown page is aimed at understanding what you currently have within your first team in terms of positions to try and identify any depth concerns you migth want to address, you can move players between different position groups depending on how you plan on using them, and also makes use of the import data on your players to provide some potential key attributes you may want to focus your development or recrutiment around. These are referred to as focusses and will highlight any attributes that the players in your squad you have assigned to a position may be lacking and even makes a suggestion for any players you have scouted that may be able to solve these needs.

An aside to this, is that in the setting of the application you can set the 'Attribute Threshold' that will drive a lot of the analysis of FMCC. This is because not every club has the same goals or needs, so telling someone managing in the National League that you should go and buy players who only have 16+ in all attributes isnt helpful for the most part, so you are able to change the threshold of what is considered the minimum youd need.

Tactical Analysis

As a FM player myself with many hours (too many) messing around with tactics and roles trying to find one that matches the image I have in my head for how i want my team to play, I've always wanted a place I can take my tactic to see if i can get any ideas of insight into how to make it work or where to improve...this is not that (yet). Tactical Analysis looks at your current tactic as displays the key attributes needed to carry out that position or role well (FM attempts to do this through comfortability stars but ive never found these to useful or accurate). In doing this, you'll be able to see what attributes your players are lacking in regards to carrying out your tactic as intended and reccomends the player in your squad who suits it best.

As well as this, there are tiles containing highlighted 'Gaps' for both in and out of possesion in terms of attributes, which may give you a better idea of the types of players you might want to look for when it comes to scouting.

Tactic Builder

While nit possessing the granularity or complexity of the FM tactics screen, Tactic Builder allows you to create formations and assing roles and be given scores and ratings on the the suitability that it has to your squad. You can drag and drop players markers on the in and out of possion picthes, choose what players will fill that position, and then make use of the 'Recommend Roles' button to auto assign the best role for that player in that position. While of course being focussed at the players stats, the application also makes use of role synergies to try and give some logic behind how players might work within the game. These role synergies are also displayed below the tactics so that you can see a breif description on how it might materialise.

Once happy with your tactic, you can then take it back over to Tactical Analysis to try and get find the areas of your squad you might need to aim to improve on in order for it work.

Scouting

An area that catches us all out at times, is player recruitment and those soul crushing moments where a scout lies to you about the ability or potential of a player you've just dropped the equivalent of a small nations GDP on, are ones we'd all rather never see happen again. Hence why I wanted to try and make this application to try and find another perspective or angle on the players that I'm trying to convice to join me in the second tier in Romania (up the Metalul Buzau).

The scouting area of this application is still for the most part a work in progress, but right now you are able to import the stats of players you have scouted in the game and this page will attempt to try and provide an idea on if they are a good fit for your squad and do they address an identified gap. Currently, this is focussed mainly on if they meet requirements to play certain positions or roles within your squad and tacitc but the hope is to bring in logic behind transfer value and wages compared to the budegts of your club, and provide an idea on personaility driven development and how that might clash with those already in your team, but those are yet to come as of right now.

------------

-Improvements-

As of right now, FMCC relies on the use of screenshots being converted into JSON files via an AI in order to be able to import data from the game. This is obviously time consuming and id like to limit the use of AI as much as possible, but with the limitations within the game currently (and with mods focussed around data export only working on Windows...sometimes) this is the best that I can think of.

Once the ability to extract CSV or XML files from the game becomes more widely useable and reliable, then I will hopefully be able to make a more streamlined version of the tool that takes less time and effort to get started with.

As discussed in some of the above section, I want to try and focus on bringing more logic to some of the analysis within the tool for things like tactics and scouting, as a bunch of numbers doesnt reflect how good a player is, and doesnt help us visualise how pairing a Invested Wing Back with Wide Central Midifield may look within the game. But i do hope that I can slowly develop this overtime so that it can become a plug and play application that provides some beneficial insight :)
