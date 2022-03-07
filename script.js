'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
    this.date = new Date();
    this.id = (Date.now() + '').slice(-10);
  }

  _setDescription = () => {
    console.log(this);
    this.description = `${this.constructor.name} on ${this.date.toLocaleString(
      'default',
      {
        month: 'long',
      }
    )} ${this.date.getDate()}`;
  };
}

class Running extends Workout {
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this.type = 'running';
    this._setDescription();
  }

  // min/km
  calcPace = () => {
    this.pace = (this.duration / this.distance).toFixed(1);
  };
}

class Cycling extends Workout {
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this.type = 'cycling';
    this._setDescription();
  }

  // km/h
  calcSpeed = () => {
    this.speed = (this.distance / this.duration).toFixed(1);
  };
}

class App {
  #map;
  #mapEvent;

  constructor() {
    this.workouts = [];
    this._getPosition();
    this._getLocalStorage();

    form.addEventListener('submit', e => {
      e.preventDefault();
      this._newWorkOut();
    });

    inputType.addEventListener('change', this._toggleElevationField);

    containerWorkouts.addEventListener('click', this._moveToPopup);
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this._loadMap, () => {
        alert("Couldn't get your position");
      });
    }
  }

  _loadMap = position => {
    const { latitude, longitude } = position.coords;
    this.#map = L.map('map').setView([latitude, longitude], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.workouts.forEach(workout => {
      this._renderMarker(workout);
    });

    this.#map.on('click', this._showForm);
  };

  _showForm = mapE => {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  };

  _hideForm = () => {
    // clear inputs
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        '';
    // hide the form
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  };

  _toggleElevationField = () => {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  };

  _newWorkOut = () => {
    // check if inputs are numbers
    const validateInputs = (...inputs) =>
      inputs.every(input => Number.isFinite(input));

    // check if inputs are positive
    const checkPositive = (...inputs) => inputs.every(input => input > 0);

    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;

    let workout;
    if (inputType.value === 'running') {
      const cadence = +inputCadence.value;
      if (
        !validateInputs(distance, duration, cadence) ||
        !checkPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    if (inputType.value === 'cycling') {
      const elevationGain = +inputElevation.value;
      if (
        !validateInputs(distance, duration, elevationGain) ||
        !checkPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers');

      workout = new Cycling([lat, lng], distance, duration, elevationGain);
    }

    // Add new object to workout array
    this.workouts.push(workout);

    // Render workout on map as marker
    this._renderMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form + clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  };

  _renderMarker = workout => {
    // Display marker
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  };

  _renderWorkout = workout => {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

    if (workout.type === 'running')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;

    form.insertAdjacentHTML('afterend', html);
  };

  _moveToPopup = e => {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    for (let workout of this.workouts) {
      if (workout.id === workoutEl.dataset.id) {
        this.#map.setView(workout.coords, 13);
        break;
      }
    }
  };

  _setLocalStorage = () => {
    localStorage.setItem('workouts', JSON.stringify(this.workouts));
  };

  _getLocalStorage = () => {
    const workouts = JSON.parse(localStorage.getItem('workouts'));

    if (!workouts) return;

    this.workouts = workouts;

    workouts.forEach(workout => {
      this._renderWorkout(workout);
    });
  };

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
