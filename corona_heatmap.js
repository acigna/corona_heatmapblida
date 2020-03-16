var CoronaHeatMap = {
	case_type: "Confirmed",

	case_url: "https://docs.google.com/spreadsheets/u/3/d/1LD7Ej7ZeDU8U7MLEFmXN0E1p3W_sPI6hQKpmvpkXHfM/export?format=csv&id=1LD7Ej7ZeDU8U7MLEFmXN0E1p3W_sPI6hQKpmvpkXHfM&gid=0",

	heatmap_config: {
  		// radius should be small ONLY if scaleRadius is true (or small radius is intended)
  		// if scaleRadius is false it will be the constant radius used in pixels
  		"radius": 0.3,
  		"maxOpacity": .8,
  		// scales the radius based on map zoom
  		"scaleRadius": true,
  		// if set to false the heatmap uses the global maximum for colorization
  		// if activated: uses the data maximum within the current map boundaries
  		//   (there will always be a red spot with useLocalExtremas true)
  		"useLocalExtrema": false,
  		// which field name in your data represents the latitude - default "lat"
  		latField: 'Lat',
  		// which field name in your data represents the longitude - default "lng"
	 	lngField: 'Long',
  		// which field name in your data represents the data value - default "value"
  		valueField: 'case_number'
	},

	updateCase: function ( case_type ) {
		this.case_type = case_type;
	},

	updateHeatMap: function ( date ) {
		var dateField = [date.getMonth() + 1,date.getDate(), date.getFullYear() - 2000].join('/');
		this.json_data.forEach(function ( data_el ) {
			data_el.case_number = data_el[dateField];
		});
		this.heatmapLayer.cfg = this.heatmap_config;
		this.heatmapLayer._heatmap.configure(this.heatmap_config);
		this.heatmapLayer._reset(); 
		this.heatmapLayer.setData(this.heatMapData);
	},

	buildMapWithTileLayer: function ( map_id ) {
		var map = L.map( map_id ).setView([36, 2], 6);
		this.map = map;
		L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png', {
    		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
		}).addTo(map);
		return map;
	},

	structureData: function ( data ) {
		var data_array = Papa.parse(data).data;
		var column_data = data_array[0];
		this.column_data = column_data;
		var json_data = data_array.splice( 1 ).map(function ( data_row ) {
			var json_row = {};
			column_data.forEach(function ( columnName, index ) {
				var columnData = data_row[ index ],
					columnDataInt = Number( columnData );
					json_row[ columnName ] = isNaN( columnDataInt ) ? columnData :  columnDataInt; 
			});
			return json_row;
		});
		this.json_data = json_data;
		this.heatMapData = {
 			max: 20,
  			data: json_data
		};
		return {column_data:column_data, json_data:json_data};
	},

	loadData: function () {
		return $.get(this.case_url);
	},

	createHeatMap: function ( map ) {
		var heatmapLayer = new HeatmapOverlay(this.heatmap_config);
		heatmapLayer.addTo(map);
		this.heatmapLayer = heatmapLayer;
		window.heatmapLayer = heatmapLayer;
		//heatmapLayer.setData(heatMapData);
		return heatmapLayer;
	},

	setUpDatesSelect: function ( date_select_id ) {
		var selectEl = document.getElementById( date_select_id ),
			self = this;
		this.dates_columns.forEach(function ( date_column, index ) {
			var optionEl = document.createElement('option');
			optionEl.value = index;
			optionEl.text =  date_column.toDateString();
			selectEl.options.add(optionEl, 0);
		});

		selectEl.selectedIndex = 0;

		selectEl.addEventListener('change', function ( ) {
			self.updateHeatMap(self.dates_columns[selectEl.options[selectEl.selectedIndex].value]);
		});
	},
 
	setUpDatesList: function ( column_data ) {
		var dates_columns = column_data.slice(4).map(function ( date_column ) {
			var date_array = date_column.split('/').map(Number);
			return new Date( 2000 + date_array[2], date_array[0] - 1, date_array[1] );
		});
		this.dates_columns = dates_columns;
		return dates_columns;
	},

	init: function ( map_id, date_select_id ) {
		var self = this;
		this.map_id = map_id;
		this.date_select_id = date_select_id
		var map = this.buildMapWithTileLayer( map_id );
		var heatmapLayer = this.createHeatMap( map );
		this.loadData().then(function( data ) {
			return self.structureData( data );
		}).then(function ( structuredData ) {
			var dates_columns = self.setUpDatesList( structuredData.column_data );
			self.setUpDatesSelect( date_select_id );
			self.updateHeatMap( dates_columns[dates_columns.length - 1] );
		});
	}
}