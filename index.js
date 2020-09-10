require([
    "esri/Map",
    "esri/views/MapView",
    "esri/widgets/BasemapToggle",
    "esri/layers/FeatureLayer",
    "esri/widgets/Legend",
    "esri/widgets/Expand",
    "esri/widgets/Search"
  ], function(Map, MapView, BasemapToggle, FeatureLayer, Legend, Expand, Search) {

    //a few functions: 
    function showCoordinates(pt) {
      var coords =
        "Lat/Lon " +
        pt.latitude.toFixed(3) +
        " " +
        pt.longitude.toFixed(3) +
        " | Scale 1:" +
        Math.round(view.scale * 1) / 1 +
        " | Zoom " +
        view.zoom;
      coordsWidget.innerHTML = coords;
    }

    // client-side queries
    function setFeatureLayerViewFilter(expression) {
      view.whenLayerView(firesLayer).then(function (featureLayerView) {
        featureLayerView.filter = {
          where: expression
        };
      });
    }

    //set up map and view
    var map = new Map({
      basemap: "topo-vector"
    });

    var view = new MapView({
      container: "viewDiv",
      map: map,
      center: [-122.188, 44.821], // longitude, latitude
      zoom: 10
    });

    // add some map elements
    // set up queries for fire layer
    var sqlExpressions = [
        ["All fires", "IsValid = 1"],
        ["Current fires - Human caused", "FireCause = 'Human' AND ContainmentDateTime IS NULL"],
        ["Current fires - Natural", "FireCause = 'Natural' AND ContainmentDateTime IS NULL"],
        ["Current fires - Unknown cause", "FireCause = 'Unknown' AND ContainmentDateTime IS NULL"],
        //recent starts
      ];
      
      var selectFilter = document.createElement("select");
      selectFilter.setAttribute("class", "esri-widget esri-select");
      
      sqlExpressions.forEach(function (sql) {
        var option = document.createElement("option");
        option.value = sql[1];
        option.innerHTML = sql[0];
        selectFilter.appendChild(option);
      });

      var coordsWidget = document.createElement("div");
      coordsWidget.id = "coordsWidget";
      coordsWidget.className = "esri-widget esri-component";
      coordsWidget.style.padding = "7px 15px 5px";

        
      var basemapToggle = new BasemapToggle({
        view: view,
        nextBasemap: "satellite"
      });

      // Configures clustering on the layer. A cluster radius
      // of 100px indicates an area comprising screen space 100px
      // in length from the center of the cluster
      const clusterConfig = {
        type: "cluster",
        clusterRadius: "100px",
        // {cluster_count} is an aggregate field containing
        // the number of features comprised by the cluster
        popupTemplate: {
          content: "This cluster represents {cluster_count} fires.",
          fieldInfos: [
            {
              fieldName: "cluster_count",
              format: {
                places: 0,
                digitSeparator: true
              }
            }
          ]
        },
        clusterMinSize: "24px",
        clusterMaxSize: "60px",
        labelingInfo: [
          {
            deconflictionStrategy: "none",
            labelExpressionInfo: {
              expression: "Text($feature.cluster_count, '#,###')"
            },
            symbol: {
              type: "text",
              color: "#0E0004",
              haloColor: "#FFFFFF",
              haloSize: "1px",
              font: {
                weight: "bold",
                family: "Noto Sans",
                size: "16px"
              }
            },
            labelPlacement: "center-center"
          }
        ]
      };

    // add features
    var firesLayer = new FeatureLayer({
        url:
          "https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/Active_Fires/FeatureServer",
        //   renderer: irwinRenderer,
        featureReduction: clusterConfig,
        labelingInfo: [{
          symbol: {
            type: "text",
            color: "#0E0004",
            haloColor: "#FFFFFF",
            haloSize: "2px",
            font: {
              size: "12px",
              family: "Noto Sans",
              style: "italic",
              weight: "normal"
            }
          },
          labelPlacement: "above-center",
          labelExpressionInfo: {
              expression: "$feature.IncidentName"
            }
        }],
        popupTemplate: {
          title: "Fire Name: {IncidentName}",
          content: "Cause: {FireCause}<br> Start date: {FireDiscoveryDateTime} <br> Acres: {CalculatedAcres}"
        },
        copyright: "NIFC IRWIN"
      });

      //Configure the view
      view.ui.add(basemapToggle, "bottom-right");

      view.ui.add(coordsWidget, "bottom-right");
          
      view.ui.add(selectFilter, "top-left");

      selectFilter.addEventListener("change", function (event) {
        setFeatureLayerViewFilter(event.target.value);
      });

      view.watch("stationary", function (isStationary) {
        showCoordinates(view.center);
      });
      
      view.on("pointer-move", function (evt) {
        showCoordinates(view.toMap({ x: evt.x, y: evt.y }));
      });

      map.add(firesLayer);

      // try to make legend next
      const legend = new Legend({
        view: view,
        container: "legendDiv"
      });

      const infoDiv = document.getElementById("infoDiv");
      view.ui.add(
        new Expand({
          view: view,
          content: infoDiv,
          expandIconClass: "esri-icon-layer-list",
          expanded: false
        }),
        "top-left"
      );

      const toggleButton = document.getElementById("cluster");

      // To turn off clustering on a firesLayer, set the
      // featureReduction property to null
      toggleButton.addEventListener("click", function () {
        let fr = firesLayer.featureReduction;
        firesLayer.featureReduction =
          fr && fr.type === "cluster" ? null : clusterConfig;
        toggleButton.innerText =
          toggleButton.innerText === "Enable Clustering"
            ? "Disable Clustering"
            : "Enable Clustering";
      });

      //add search widget
      var searchWidget = new Search({
        view: view,
        allPlaceholder: "Search Incidents",
        sources: [
          {
            layer: firesLayer,
            searchFields: ["IncidentName"],
            displayField: "IncidentName",
            exactMatch: false,
          }
        ]
      });

      // Add the search widget to the top left corner of the view
      view.ui.add(searchWidget, {
        position: "top-right"
      });

  });
