   var baseUrlGet = (getQueryString()["gpx"]==undefined || getQueryString()["gpx"]=="") ? "gpx/ramberget.gpx" : getQueryString()["gpx"];
    var getDataObj = new getData(baseUrlGet,receiveData,"xml","get",undefined,undefined);
    var trackpoints;
    var profilepoints;
    var climbpoints;


    //Max and min altitude in meters
    var maxAlt = -500.0;
    var minAlt = 10000.0;
    var totalDist = 0.0;
    var totalGain = 0.0;
    var distLineUnit = (getQueryString()["kmfactor"]==undefined || getQueryString()["kmfactor"]=="") ? 1 : parseFloat(getQueryString()["kmfactor"]) ;
    var textOnNthDistLine = (getQueryString()["nthline"]==undefined || getQueryString()["nthline"]=="") ? 1 : parseInt(getQueryString()["nthline"]) ;

    //Presentation size of curce
    var profileWidth=(getQueryString()["pwidth"]==undefined || getQueryString()["pwidth"]=="") ? 1024.0 : parseFloat(getQueryString()["pwidth"]) ;
    var profileHeight = (getQueryString()["pheight"]==undefined || getQueryString()["pheight"]=="") ? 256.0 : parseFloat(getQueryString()["pheight"]) ;


    var widthFactor=1.0;
    var heightFactor=1.0;
    var textMargin = (getQueryString()["margin"]==undefined || getQueryString()["margin"]=="") ? 56.0 : parseFloat(getQueryString()["margin"]) ;
    var showGradient =(getQueryString()["grd"]==undefined || getQueryString()["grd"]=="") ? 1 : parseInt(getQueryString()["grd"]) ;
    var extrusionSize = 32;
    var extrusionAngle = 225;
    var skewAngle =(getQueryString()["skew"]==undefined || getQueryString()["skew"]=="") ? -10 : -Math.abs(parseFloat(getQueryString()["skew"])) ;
    var shwSkew = -45.0;
    var shwSize = 0.5;

    getDataObj.url = baseUrlGet;
    getDataObj.getData();

    //Catches the response xml
    function receiveData(node)
    {
         trackpoints = node.getElementsByTagName("trkpt");
         profilepoints = new Array(trackpoints.length);


         //Loop to reshape data and get max min values
         var prevAlt = 0.0;
         for(var i = 0; i < trackpoints.length ; i++ )
         {
             //Find minAlt/maxAlt
             alt = getAlt(trackpoints[i]);
             if(alt < minAlt){minAlt = alt;}
             if(alt > maxAlt){maxAlt = alt;}

             totalGain += (alt > prevAlt && i > 0)?(alt-prevAlt):0;

             var localDist = 0;
             if(i > 0){
             localDist = haversine(
                       trackpoints[i-1].getAttribute("lat"),
                       trackpoints[i].getAttribute("lat"),
                       trackpoints[i-1].getAttribute("lon"),
                       trackpoints[i].getAttribute("lon")
                       );
                       totalDist += localDist;
             }


             profilepoints[i] = [totalDist, alt, getSlope(localDist,alt - prevAlt)];


             prevAlt = alt;
         }
         


         //profileWidth -= Math.abs(Math.cos((Math.PI/180.0)*extrusionAngle)*extrusionSize)
         //profileHeight-= Math.abs(Math.tan((Math.PI/180.0)*extrusionAngle)*extrusionSize)

         //Scale profile data to presentation size
         widthFactor = profileWidth/totalDist;
         heightFactor = profileHeight/(maxAlt - minAlt);

         //Set start of curve
         if(profilepoints[0][1] > minAlt)
         {
             CreateExtrusionForSegment( 0,
                                       profileHeight,
                                       (profilepoints[0][0]*widthFactor),
                                       (profileHeight-((profilepoints[0][1]-minAlt)*heightFactor)),
                                       extrusionSize,
                                       extrusionAngle,
                                       "rgb(128,128,128)"
                                       );
         }
         var aPathData = new Array(profilepoints.length + 2);
         aPathData[0] = "M" + (profilepoints[0][0]*widthFactor) + " " + (profileHeight-((profilepoints[0][1]-minAlt)*heightFactor)) ;
         //Loop to create the curve
         var climbWatch = new Array(2);
         var climbRecord = -1;
         for ( var i = 1; i < profilepoints.length ; i++ )
         {
             aPathData[i] = " L" + (profilepoints[i][0]*widthFactor) + " " + (profileHeight-((profilepoints[i][1]-minAlt)*heightFactor));
             CreateExtrusionForSegment((profilepoints[i-1][0]*widthFactor),
                                       (profileHeight-((profilepoints[i-1][1]-minAlt)*heightFactor)),
                                       (profilepoints[i][0]*widthFactor),
                                       (profileHeight-((profilepoints[i][1]-minAlt)*heightFactor)),
                                       extrusionSize,
                                       extrusionAngle,
                                       profilepoints[i][2]
                                       );
                                       
             //Record climb data
             climbRecord = (profilepoints[i][1] > profilepoints[i-1][1] && climbRecord == -1 )? i: climbRecord ;
             climbRecord = (profilepoints[i][1] < (profilepoints[i-1][1]-(70.0)) &&  climbRecord > -1)? -1: climbRecord ;
             climbWatch[0] = (profilepoints[i][1]  > profilepoints[i-1][1] && i > 0)?climbWatch[0]+(profilepoints[i][0]-profilepoints[i-1][0]):0;
             climbWatch[1] = (profilepoints[i][1]  > profilepoints[i-1][1] && i > 0)?climbWatch[1]+(profilepoints[i][1] -profilepoints[i-1][1] ):0;


             //Qualify that climb is long enough
             if(climbWatch[0] > 0.3)
             {
             
                   var rad = Math.atan2(climbWatch[0]*1000,climbWatch[1]);
                   var slope =  parseInt(90 - (180/Math.PI)*rad );
                  //Qualify that climb is steep enough
                  if(slope > 2.7)
                  {


                      CreateClimbMarker((profilepoints[climbRecord][0]*widthFactor),
                                       (profilepoints[i][0]*widthFactor),
                                       (profileHeight-((profilepoints[climbRecord][1]+(climbWatch[1]*0.5) )*heightFactor)),
                                       climbWatch[0],
                                       rad
                                       );

                  }
                  
                  climbWatch[0] = 0;
                      climbWatch[1] = 0;
                      climbRecord = -1;
             }


         }
         
         //Close the curve to a shape
         aPathData[profilepoints.length]= " L" + profileWidth + " " + profileHeight ;
         aPathData[profilepoints.length+1] = " L0 " + profileHeight +"z" ;
         document.getElementById("masterProfile").setAttribute("d", aPathData.join(""));
         document.getElementById("masterProfileShw").setAttribute("d", aPathData.join(""));
         document.getElementById("masterProfileClimb").setAttribute("d", aPathData.join(""));
         document.getElementById("masterProfileClip").setAttribute("d", aPathData.join(""));

         
         document.getElementById("masterProfileShw").setAttribute("transform",
                                                                             "translate(" + ( Math.cos((Math.PI/180.0)*+(shwSkew))*(profileHeight+textMargin) )  + "," +
                                                                             ((profileHeight + (profileHeight*shwSize))  ) +
                                                                             ") scale(1,-" + shwSize +") skewX(" + (shwSkew)+ ")");

         //Adjust position to acoomodate the extrusion
         document.getElementById("layer1").setAttribute(
                                                        "transform",
                                                        "translate(0," + ( Math.tan((Math.PI/180.0)*skewAngle)*-(profileWidth+textMargin) ) + ") " +
                                                        "skewY(" + skewAngle + ")"
                                                        );
         
         //Adjust position to acoomodate the extrusion
         document.getElementById("slopeComposite").setAttribute(
                                                        "transform",
                                                        "translate(" + (Math.abs(Math.cos((Math.PI/180.0)*extrusionAngle)*extrusionSize)+textMargin) +
                                                        ","  + Math.abs(Math.sin((Math.PI/180.0)*extrusionAngle)*extrusionSize) +
                                                        ")"
                                                        );

                                                        
         document.getElementById("profileClipRect").setAttribute("height", profileHeight);

         document.getElementById("gainText").setAttribute("transform","translate(0," + (6+profileHeight*0.5) +")");
         document.getElementById("gainText").firstChild.nodeValue = Math.round(totalGain) + "m";

         document.getElementById("minAltLine").setAttribute("width",(profileWidth + textMargin ));
         document.getElementById("minAltLine").setAttribute("transform","translate(" + 0 + "," + (profileHeight) +")");
         document.getElementById("minAltText").setAttribute("transform","translate(0," + (profileHeight-4) +")");
         document.getElementById("minAltText").firstChild.nodeValue = minAlt + "m";
         
         document.getElementById("maxAltLine").setAttribute("width",(profileWidth + textMargin ));
         document.getElementById("maxAltLine").setAttribute("transform","translate(" + 0 + "," + (0) +")");
         document.getElementById("maxAltText").setAttribute("transform","translate(0," + (12) +")");
         document.getElementById("maxAltText").firstChild.nodeValue = maxAlt + "m";



         createDistLines();


    }
    
    function CreateExtrusionForSegment(segStartX, segStartY, segEndX,segEndY, eSize, eAngle, slopeColor)
    {
        var shape = document.createElementNS("http://www.w3.org/2000/svg", "path");
    	shape.setAttribute("d", "M" +
                                segStartX + " " + segStartY +
                                " L" + segEndX + " " + segEndY +
                                " L" + (segEndX + Math.cos((Math.PI/180.0)*eAngle)*eSize) + " " + (segEndY + Math.sin((Math.PI/180.0)*eAngle)*eSize) +
                                " L" + (segStartX + Math.cos((Math.PI/180.0)*eAngle)*eSize) + " " + (segStartY + Math.sin((Math.PI/180.0)*eAngle)*eSize) +
                                 "z" );
		shape.setAttribute("stroke", "#fff");
		shape.setAttribute("stroke-width", "0.25");
		shape.setAttribute("fill", slopeColor );
		shape.setAttribute("opacity", "1");
        document.getElementById("slopeDetail").insertBefore(shape,document.getElementById("slopeDetail").firstChild);
    }
    
      function CreateClimbMarker(segStartX, segEndX, alt, dist, slope)
    {
    
        //CategoryCalc
        var cat = Math.max(5-parseInt(Math.sin(slope)*(dist*10)),1);

		document.getElementById("climbClipPath").setAttribute("d",
                                                                  document.getElementById("climbClipPath").getAttribute("d") +
                                                                  "M" + segStartX + " 0" +
                                                                  "L" + segEndX + " " + 0 +
                                                                  "L" + segEndX + " " + profileHeight +
                                                                  "L" + segStartX + " " + profileHeight +
                                                                  "z ")

        var shape = document.createElementNS("http://www.w3.org/2000/svg", "path");
		shape.setAttribute("d", document.getElementById("climbIcon").getAttribute("d"));
        //sx =  (((segStartX +(segEndX-segStartX)*0.5))-(Math.cos((Math.PI/180.0)*(extrusionAngle-180))*16)) ;
        //sy = (alt-(Math.sin((Math.PI/180.0)*(extrusionAngle-180))*16))
        sx = (segStartX +(segEndX-segStartX)*0.5);
        sy = (profileHeight - 8);
		shape.setAttribute("transform", "translate(" + sx + "," + sy + ")" );
		shape.setAttribute("stroke", "#777");
		shape.setAttribute("stroke-width", "1");
		shape.setAttribute("fill", "white" );
		shape.setAttribute("fill-rule", "evenodd" );
        document.getElementById("climbIcons").insertBefore(shape,document.getElementById("climbIcons").firstChild);
        
        var shapeT = document.createElementNS("http://www.w3.org/2000/svg", "text");
        //sx =  (((segStartX +(segEndX-segStartX)*0.5))-(Math.cos((Math.PI/180.0)*(extrusionAngle-180))*16)) ;
        //sy = (alt-(Math.sin((Math.PI/180.0)*(extrusionAngle-180))*16))
        shapeT.setAttribute("x",sx -2 );
        shapeT.setAttribute("y", sy - 5 );
        shapeT.setAttribute("fill", "#000" );
        shapeT.setAttribute("font-weight", "bold");
        var data = document.createTextNode(cat);
        shapeT.appendChild(data);
        document.getElementById("climbIcons").appendChild(shapeT);
    }
    
    function createDistLines()
    {
    
             var strd =  "M" + (Math.abs(Math.cos((Math.PI/180.0)*extrusionAngle)*extrusionSize)) + "," + (0) +
                         " L" + profileWidth + " 0" +
                         " L" + (profileWidth + (Math.abs(Math.cos((Math.PI/180.0)*extrusionAngle)*extrusionSize))) + " " + (( (Math.abs(Math.sin((Math.PI/180.0)*extrusionAngle)*extrusionSize)))) +
                         " L" + (profileWidth + (Math.abs(Math.cos((Math.PI/180.0)*extrusionAngle)*extrusionSize))) + " " + (profileHeight + ( (Math.abs(Math.sin((Math.PI/180.0)*extrusionAngle)*extrusionSize)))) +
                         " L" + ((Math.abs(Math.cos((Math.PI/180.0)*extrusionAngle)*extrusionSize))) + " " + (profileHeight + ( (Math.abs(Math.sin((Math.PI/180.0)*extrusionAngle)*extrusionSize)))) +
                         "z";
    
    

             document.getElementById("mouseCatcher").setAttribute("d",strd);

             document.getElementById("mouseCatcher").setAttribute("transform", "translate(" + textMargin +",0)");


             //Distance in km
             lineNo = totalDist*distLineUnit;
             iLineNo =  parseInt(lineNo)

             for(var i=0; i <= iLineNo; i++)
             {
              createDistLine((i*(profileWidth/lineNo)),i%textOnNthDistLine==0?(i/distLineUnit).toString():"");
             }
             createDistLine(profileWidth, Math.round(totalDist*1000)/1000);
    }
    
    function createDistLine(xPos,dist)
    {
                      var shape = document.createElementNS("http://www.w3.org/2000/svg", "path");
                      var strd = "M" + (xPos + textMargin) + " 0" +
                                 " L" + (xPos + textMargin) + " " + profileHeight +
                                 " L" + ((xPos + textMargin)+(Math.cos((Math.PI/180.0)*(extrusionAngle-180))*64)) + " " + (profileHeight+(Math.sin((Math.PI/180.0)*(extrusionAngle-180))*64) )
      	              shape.setAttribute("d", strd);
                      shape.setAttribute("stroke", "#ddd");
            	      shape.setAttribute("stroke-width", "1");
               	      shape.setAttribute("fill", "none" );
                  	  shape.setAttribute("opacity", "1.0");

                      document.getElementById("distLines").insertBefore(shape,document.getElementById("distLines").firstChild);

                      var shapeT = document.createElementNS("http://www.w3.org/2000/svg", "text");
                      sx =  ((xPos + textMargin)+(Math.cos((Math.PI/180.0)*(extrusionAngle-180))*64)) ;
                      sy = (profileHeight+(Math.sin((Math.PI/180.0)*(extrusionAngle-180))*64))
       	              shapeT.setAttribute("x",sx );
      	              shapeT.setAttribute("y", sy );
               	      shapeT.setAttribute("fill", "#000" );
                      var data = document.createTextNode(dist + (dist==""? "" :" km"));
                      shapeT.appendChild(data);

                      document.getElementById("distLines").insertBefore(shapeT,document.getElementById("distLines").firstChild);
    }
    
    function getSlope(dist,alt)
    {
    
        if(showGradient==0){ return "rgb(128,128,128)";}
        dist = dist*1000.0
        var rad = Math.atan2(dist,alt);
        var angle =  parseInt(90 - (180/Math.PI)*rad );
        return "rgb(" +
             parseInt(128 + Math.min(angle*9,127)).toString() +
             "," +
             "128" +
             "," +
             parseInt(Math.min(128+angle*9,127)).toString() +
             ")"
    }

    function getAlt(trkpt)
    {
             return parseFloat(trkpt.getElementsByTagName('*')[0].firstChild.nodeValue) ;
    }

    function getQueryString() {
      var result = {}, queryString = location.search.substring(1),
          re = /([^&=]+)=([^&]*)/g, m;

      while (m = re.exec(queryString)) {
        result[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
      }

      return result;
    }

    //Returns approximate distance in km between two lat/long values
    function haversine(lat1,lat2,lon1,lon2)
    {
             var R = 6371;
             var dLat = (lat2-lat1)*(Math.PI / 180);
             var dLon = (lon2-lon1)*(Math.PI / 180);
             var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                     Math.cos(lat1*(Math.PI / 180)) * Math.cos(lat2*(Math.PI / 180)) *
                     Math.sin(dLon/2) * Math.sin(dLon/2);
             var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
             var d = R * c;
             return d;
    }
    
    //Events

	function drag(evt,that)
	{
        var adjustedX =  evt.clientX -(Math.abs(Math.cos((Math.PI/180.0)*extrusionAngle)*extrusionSize)+textMargin);
        var resultAlt = getProfileIntersectionHeight(adjustedX)[0];

        document.getElementById("cursorLineContd").setAttribute("y1", -(Math.abs(Math.sin((Math.PI/180.0)*extrusionAngle)*extrusionSize))  );
   	    document.getElementById("cursorLineContd").setAttribute("y2", resultAlt -(Math.abs(Math.sin((Math.PI/180.0)*extrusionAngle)*extrusionSize)));
	    document.getElementById("cursorLineContd").setAttribute("x1",adjustedX -(Math.abs(Math.cos((Math.PI/180.0)*extrusionAngle)*extrusionSize)) );
        document.getElementById("cursorLineContd").setAttribute("x2",adjustedX -(Math.abs(Math.cos((Math.PI/180.0)*extrusionAngle)*extrusionSize)));
        
	    document.getElementById("cursorLine").setAttribute("y1", resultAlt);
        document.getElementById("cursorLine").setAttribute("y2", profileHeight);
	    document.getElementById("cursorLine").setAttribute("x1",adjustedX );
        document.getElementById("cursorLine").setAttribute("x2",adjustedX );

        document.getElementById("cursorLineHeight").setAttribute("y1", resultAlt-(Math.abs(Math.sin((Math.PI/180.0)*extrusionAngle)*extrusionSize)));
        document.getElementById("cursorLineHeight").setAttribute("y2", resultAlt);
	    document.getElementById("cursorLineHeight").setAttribute("x1", adjustedX -(Math.abs(Math.cos((Math.PI/180.0)*extrusionAngle)*extrusionSize)) );
        document.getElementById("cursorLineHeight").setAttribute("x2", adjustedX );
        
        document.getElementById("cur").setAttribute("transform","translate(" + (adjustedX) + "," + ( resultAlt        ) +")");
        document.getElementById("cursorLineText").firstChild.nodeValue = Math.round(getProfileIntersectionHeight(adjustedX)[1]) + "m | " + (Math.round((adjustedX/widthFactor)*1000)/1000)  + "km";
        document.getElementById("cursorLineTextGlow").firstChild.nodeValue = Math.round(getProfileIntersectionHeight(adjustedX)[1]) + "m | " + (Math.round((adjustedX/widthFactor)*1000)/1000)  + "km";

        document.getElementById("cur").setAttribute("visibility","visible");
        document.getElementById("cursorLine").setAttribute("visibility","visible");

        document.getElementById("masterProfileClip").setAttribute("visibility","visible");
        document.getElementById("profileClipRect").setAttribute("width", adjustedX );
	}

	function out(evt,that)
	{
         document.getElementById("cur").setAttribute("visibility","hidden");
         document.getElementById("cursorLine").setAttribute("visibility","hidden");
         document.getElementById("masterProfileClip").setAttribute("visibility","hidden");

	}

    function getProfileIntersectionHeight(xPos)
    {
             for ( var i = 0; i < profilepoints.length ; i++ )
             {
                 if(parseFloat(profilepoints[i][0])*widthFactor > xPos)
                 {

                   return  [profileHeight - ( ((profilepoints[i][1]-minAlt))*1.0)*heightFactor,  profilepoints[i-1][1]]
                 }
             }
    }