// ==UserScript==
// @name            Spotify Skip
// @namespace       http://maciej.gierej.pl
// @description     It allows to temporarly skip desired songs in any playlist. Use "Skip this song" option in the context menu.
// @description:pl  Skrypt pozwala na tymczasowe pominięcie utworów w dowolnej liście odtwarzania. Użyj "Skip this song" w menu kontekstowym (PPM na tytule utworu).
// @version         1.0.1
// @author          Maciej Gierej <makg@makg.eu>
// @icon            https://raw.githubusercontent.com/MakG10/spotify-scripts/master/assets/icon.png
// @include         https://open.spotify.com/*
// @grant           none
// ==/UserScript==

(function () {
	var i18n = {
		skip: 'Skip this song'
	};

	var SpotifySkip = {
		tracks: [],
		tracksReversed: [],
		skippedTracks: [],

		_initialized: false,
		_url: window.location.href,

		onInit: function(callback) {
			var observer = new MutationObserver(function(mutations) {
				if(SpotifySkip._initialized) return;

				for(var i = 0; i < mutations.length; i++) {
					if(mutations[i].target.className === 'connect-device-list-container') {
						SpotifySkip._initialized = true;
						SpotifySkip._url = window.location.href;

						callback();
						observer.disconnect();
						break;
					}
				}
			});

			observer.observe(document, {childList: true, subtree: true});
		},
		onUrlChange: function(callback) {
			var observer = new MutationObserver(function(mutations) {
				var tracklist = SpotifySkip._getTracklistContainer();

				if(tracklist) {
					callback();

					observer.disconnect();
				}
			});

			setInterval(function() {
				if(SpotifySkip._url !== window.location.href) {
					SpotifySkip._url = window.location.href;

					var tracklist = SpotifySkip._getTracklistContainer();

					if(tracklist) {
						callback();
					} else {
						observer.observe(document, {childList: true, subtree: true});
					}
				}
			}, 200);
		},
		onPlayerInit: function(callback) {
			var observer = new MutationObserver(function(mutations) {
				for(var i = 0; i < mutations.length; i++) {
					if(mutations[i].target.className === 'now-playing') {
						callback();
						observer.disconnect();
						break;
					}
				}
			});

			observer.observe(document, {childList: true, subtree: true});
		},
		readTracks: function() {
			var elements = document.querySelectorAll('.tracklist .tracklist-row');

			var tracks = [];
			elements.forEach(function(element) {
				tracks.push({
					name: element.querySelector('.tracklist-name').innerHTML,
					top: element.getBoundingClientRect().top,
					element: element
				});
			});

			this.tracks = tracks;

			this.tracksReversed = Array.prototype.slice.call(this.tracks);
			this.tracksReversed.reverse();
		},
		toggleTrack: function(positionTop) {
			for(var i = 0; i < this.tracksReversed.length; i++) {
				if(this.tracksReversed[i].top < positionTop) {
					var name = this.tracksReversed[i].name;

					var index;
					if((index = this.skippedTracks.indexOf(name)) >= 0) {
						this.skippedTracks.splice(index, 1);

						this.tracksReversed[i].element.style = '';
					} else {
						this.skippedTracks.push(name);

						this.tracksReversed[i].element.style = 'text-decoration: line-through;opacity: 0.4;';
					}

					return;
				}
			}
		},
		watchPlaylist: function() {
			var observer = new MutationObserver(function(mutations, observer) {
				for(var i = 0; i < mutations.length; i++) {
					if(mutations[i].type !== 'characterData') continue;

					var currentSong = mutations[i].target.textContent;

					if(SpotifySkip.skippedTracks.indexOf(currentSong) >= 0) {
						SpotifySkip._getForwardButton().click();
						return;
					}
				}
			});

			observer.observe(this._getNowPlaying(), {characterData: true, childList: true, subtree: true});
		},
		_getNowPlaying: function() {
			return document.querySelector('.now-playing-bar .track-info__name');
		},
		_getForwardButton: function() {
			return document.querySelector('.player-controls .spoticon-skip-forward-16');
		},
		_getTracklistContainer: function() {
			return document.querySelector('.tracklist .tracklist-row');
		}
	};

	var contextMenu = {
		injectUI: function() {
			var skipButton = document.createElement('div');
			skipButton.className = 'react-contextmenu-item';
			skipButton.id = 'mg-spotify-skip-song';
			skipButton.innerHTML = i18n.skip;

			var menu = this._getTrackContextMenu();

			skipButton.addEventListener('click', function() {
				var positionTop = menu.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop);
				SpotifySkip.toggleTrack(positionTop);

				menu.classList.remove('react-contextmenu--visible');
				menu.style.opacity = '0';
				menu.style.pointerEvents = 'none';
			});

			menu.appendChild(skipButton);
		},
		_getTrackContextMenu: function() {
			return document.querySelectorAll('.react-contextmenu')[0];
		}
	};

	SpotifySkip.onInit(function() {
		SpotifySkip.readTracks();
		contextMenu.injectUI();

		SpotifySkip.onPlayerInit(function() {
			SpotifySkip.watchPlaylist();
		});

		SpotifySkip.onUrlChange(function() {
			SpotifySkip.readTracks();
		});
	});
}());
