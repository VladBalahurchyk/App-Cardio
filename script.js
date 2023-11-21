'use strict'

const form = document.querySelector('.form')
const containerWorkouts = document.querySelector('.workouts')
const deletionDataBtn = document.querySelector('.workout__deletion-data-btn')
const inputType = document.querySelector('.form__input--type')
const inputDistance = document.querySelector('.form__input--distance')
const inputDuration = document.querySelector('.form__input--duration')
const inputTemp = document.querySelector('.form__input--temp')
const inputClimb = document.querySelector('.form__input--climb')
const createWorkoutHint = document.querySelector('.workout-hint')
const workoutOptionsBtn = document.querySelector('.workout__options')
const alertWindow = document.querySelector('.alert-window')
const alertWindowBtns = document.querySelector('.alert-window__btns')
const overlay = document.querySelector('.overlay')

//---------Класи для створення екземплярів тренувань-----------------------
class Workout {
  date = new Date()
  id = (Date.now() + '').slice(-10)

  constructor(distance, duration, coords) {
    this.distance = distance
    this.duration = duration
    this.coords = coords
  }
  _setDescription() {
    this.description =
      this.name === 'running'
        ? `Пробежка ${new Intl.DateTimeFormat('uk-UA').format(this.date)}`
        : `Велотренировка ${new Intl.DateTimeFormat('uk-UA').format(this.date)}`
  }
}

class Running extends Workout {
  name = 'running'
  constructor(distance, duration, coords, temp) {
    super(distance, duration, coords)
    this.temp = temp
    this.calculatePace()
    this._setDescription()
  }

  calculatePace() {
    this.pace = this.duration / this.distance
  }
}

class Cycling extends Workout {
  name = 'cycling'
  constructor(distance, duration, coords, climb) {
    super(distance, duration, coords)
    this.climb = climb
    this.calculateSpeed()
    this._setDescription()
  }

  calculateSpeed() {
    this.speed = this.distance / (this.duration / 60)
  }
}

//---------Клас з усією функціоналністю додатка-----------------------
class App {
  #map
  #mapEvent
  #workouts = []
  currentWorkout

  constructor() {
    // отримання місцезнаходження користувача
    this._getPosition()

    // отримання даних з locale storage
    this._getDataFromLocalStorage()

    form.addEventListener('submit', this._newWorkout.bind(this))

    inputType.addEventListener('change', this._toggleClimdField)

    containerWorkouts.addEventListener('click', this._moveToWorkout.bind(this))

    deletionDataBtn.addEventListener('click', this._alertAndFuncOfAlertWindow.bind(this))

    overlay.addEventListener('click', this._onClickOverlayFunctionality.bind(this))
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
        alert('Невозможно установить ваше местоположения')
      })
    }
  }
  _loadMap(position) {
    const { latitude, longitude } = position.coords
    this.#map = L.map('map').setView([latitude, longitude], 13)

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map)

    //додаємо обробник подій (клік по карті)
    this.#map.addEventListener('click', this._showForm.bind(this))

    // відображаєто дані з local storage на карті
    this.#workouts.forEach(workout => this._displayWorkoutOnMap(workout))
  }

  _showForm(event) {
    this.#mapEvent = event
    form.classList.remove('hidden')
    inputDistance.focus()

    // ховаємо підказку створення тренування
    if (!createWorkoutHint.classList.contains('hidden')) createWorkoutHint.classList.add('hidden')
  }

  _hideForm() {
    form.classList.add('hidden')
    inputDistance.value = inputDuration.value = inputTemp.value = inputClimb.value = ''
  }

  _toggleClimdField() {
    inputClimb.closest('.form__row').classList.toggle('form__row--hidden')
    inputTemp.closest('.form__row').classList.toggle('form__row--hidden')
  }

  _isInputValid(typeOfWorkout, ...values) {
    const areNumbers = values.every(numb => Number.isFinite(numb))
    let areNumbersPositive

    if (typeOfWorkout === 'running') {
      areNumbersPositive = values.every(numb => numb > 0)
    }
    // якщо це 'cycling' треба виключити з перевірки limb
    if (typeOfWorkout === 'cycling') {
      const valuesWithoutClimb = values.slice(0, 2)
      areNumbersPositive = valuesWithoutClimb.every(numb => numb > 0)
    }

    return areNumbers && areNumbersPositive
  }

  _newWorkout(e) {
    e.preventDefault()
    const { lat, lng } = this.#mapEvent.latlng

    // зчитуємо введені дані тренування з форми
    const type = inputType.value
    const distance = +inputDistance.value
    const duration = +inputDuration.value

    let workout

    if (type === 'running') {
      const temp = +inputTemp.value

      // перевірка данних на валідність
      if (!this._isInputValid(type, distance, duration, temp)) return this._alertAndFuncOfAlertWindow(e)

      // створити тренування - біг
      workout = new Running(distance, duration, [lat, lng], temp)
    }

    if (type === 'cycling') {
      const climb = +inputClimb.value

      // перевірка данних на валідність
      if (!this._isInputValid(type, distance, duration, climb)) return this._alertAndFuncOfAlertWindow(e)

      // створити тренування - вело-їзда
      workout = new Cycling(distance, duration, [lat, lng], climb)
    }

    // зберегти тренування в масив тренувань
    this.#workouts.push(workout)

    //відобразити тренування на карті
    this._displayWorkoutOnMap(workout)

    // відобразити тренування в списку
    this._displayWorkoutOnSidebar(workout)

    //очистити поля введення даних і сховати форму
    this._hideForm()

    // збереження масива тренувань в localStorage
    this._saveDataOnLocalStorage()

    // відображаємо кнопку видалення всіх тренувань
    deletionDataBtn.classList.remove('hidden')
  }

  _displayWorkoutOnMap(workout) {
    workout.marker = new L.Marker(workout.coords, { draggable: false })
    this.#map.addLayer(workout.marker)
    workout.marker
      .bindPopup(
        L.popup({
          maxWidth: 220,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.name}-popup`,
        })
      )
      .setPopupContent(`${workout.name === 'running' ? '🏃' : '🚵‍♂️'} ${workout.description} `)
      .openPopup()
  }

  _removeWorkoutFromMap(workout) {
    if (!workout) return
    this.#map.removeLayer(workout.marker)
  }

  _displayWorkoutOnSidebar(workout) {
    let html = `
      <li class="workout workout--${workout.name}" data-id=${workout.id}>
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${workout.name === 'running' ? '🏃' : '🚵‍♂️'}</span>
            <span class="workout__value">${workout.distance}</span>
            <form>
               <input type='number' class='workout__input' value='${workout.distance}'></input>
            </form>
            <span class="workout__unit">км</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <form>
               <input type='number' class='workout__input' value='${workout.duration}'></input>
            </form>
            <span class="workout__unit">мин</span>
          </div>
         `
    if (workout.name === 'running') {
      html += `
         <div class="workout__details">
            <span class="workout__icon">📏⏱</span>
            <span class="workout__value">${workout.pace.toFixed(2)}</span>
            <span class='workout__value--сannot-edit'>———</span>
            <span class="workout__unit">мин/км</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">👟⏱</span>
            <span class="workout__value">${workout.temp}</span>
            <form>
               <input type='number' class='workout__input' value='${workout.temp}'></input>
            </form>
            <span class="workout__unit">шаг/мин</span>
          </div>
         `
    }
    if (workout.name === 'cycling') {
      html += `
         <div class="workout__details">
            <span class="workout__icon">📏⏱</span>
            <span class="workout__value">${workout.speed.toFixed(2)}</span>
            <span class='workout__value--сannot-edit'>———</span>
            <span class="workout__unit">км/ч</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🏔</span>
            <span class="workout__value">${workout.climb}</span>
            <form>
               <input type='number' class='workout__input' value='${workout.climb}'></input>
            </form>
            <span class="workout__unit">м</span>
          </div>
         `
    }
    html += `
      <div class="workout__options"></div>
      <div class="workout__btns hidden">
      <button class="workout__btn workout__btn--edit">Редактировать</button>
      <button class="workout__btn workout__btn--delete">Удалить</button> 
      </div>
      </li> 
      `
    form.insertAdjacentHTML('afterend', html)

    // кнопка опції тренувань і її обробник подій
    const workoutOptionsBtn = document.querySelector('.workout__options')
    workoutOptionsBtn.addEventListener('click', this._openOrCloseSettingsOfWorkout)

    // додаємо обробник подій до кнопок тренування
    document.querySelector('.workout').addEventListener('click', this._functionalityOfWorkoutButtons.bind(this))
  }

  _moveToWorkout(e) {
    const workoutInListWorkouts = e.target.closest('.workout')
    if (!workoutInListWorkouts) return
    const workoutId = workoutInListWorkouts.dataset.id
    const workout = this.#workouts.find(item => item.id === workoutId)
    this.#map.setView(workout.coords, 13, {
      animate: true,
      pan: { duration: 1 },
    })
  }

  _saveDataOnLocalStorage() {
    // з тренувань вилучаємо marker-s (їх не можна передати через "circular structure")
    const workoutsWithoutMarkers = this.#workouts.map(w => (({ marker, ...rest }) => rest)(w))

    localStorage.setItem('workouts', JSON.stringify(workoutsWithoutMarkers))
  }

  _getDataFromLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'))

    // якщо елемента data не існує
    if (!data) {
      createWorkoutHint.classList.remove('hidden')
      return
    }
    // якщо є хоч один елемент в data
    data[0] ? deletionDataBtn.classList.remove('hidden') : createWorkoutHint.classList.remove('hidden')

    this.#workouts = data

    //відражаєто дані з local storage в сайтбарі
    this.#workouts.forEach(workout => this._displayWorkoutOnSidebar(workout))
  }

  _openOrCloseSettingsOfWorkout(e) {
    const workoutInListWorkouts = e.target.closest('.workout')
    workoutInListWorkouts.querySelector('.workout__btns').classList.toggle('hidden')
  }

  _toggleWorkoutButtons(btn1, btn2) {
    const btn = this.currentWorkout.querySelector(`.workout__btn--${btn1}`)
    btn.textContent =
      btn2 === 'cancel' ? 'Отмена' : btn2 === 'edit' ? 'Редактировать' : btn2 === 'confirm' ? 'Подтвердить' : 'Удалить'
    btn.classList.add(`workout__btn--${btn2}`)
    btn.classList.remove(`workout__btn--${btn1}`)
  }

  _functionalityOfWorkoutButtons(e) {
    const clickedButton = e.target
    // визначаємо тренування, з яким працюємо
    this.currentWorkout = clickedButton.closest('.workout')

    if (!clickedButton.classList.contains('workout__btn')) return

    // --------------натиснення кнопки "УДАЛИТЬ"--------------------
    if (clickedButton.classList.contains('workout__btn--delete')) {
      this._alertAndFuncOfAlertWindow(e)
    }

    //-----------------натиснення кнопки "РЕДАКТИРОВАТЬ"---------------
    if (clickedButton.classList.contains('workout__btn--edit')) {
      this.currentWorkout.classList.add('workout--edit')
      overlay.classList.remove('hidden')

      // з кнопки "Редактировать" робимо кнопку "Отмена"
      this._toggleWorkoutButtons('edit', 'cancel')

      // з кнопки "Удалить" робимо кнопку "Подтвердить"
      this._toggleWorkoutButtons('delete', 'confirm')

      this.currentWorkout.querySelector('.workout__input').focus()

      return
    }

    const nodeListOfInputs = this.currentWorkout.querySelectorAll('.workout__input')
    const nodeListOfValues = this.currentWorkout.querySelectorAll('.workout__value')

    //--------натиснення кнопки "ОТМЕНА"--------------------
    if (clickedButton.classList.contains('workout__btn--cancel')) {
      this._funcOfСancelEditWorkoutBtn.call(this)
      overlay.classList.add('hidden')

      //в input-и повертаємо значення з тренування
      nodeListOfInputs[0].value = nodeListOfValues[0].textContent
      nodeListOfInputs[1].value = nodeListOfValues[1].textContent
      nodeListOfInputs[2].value = nodeListOfValues[3].textContent
    }

    //-------натиснення кнопки "ПОДТВЕРДИТЬ"--------------------
    if (clickedButton.classList.contains('workout__btn--confirm')) {
      // визначаємо чи данне тренування є бігом
      const isWorkoutTypeRunning = this.currentWorkout.classList.contains('workout--running')

      // зчитуэмо значення з input-ів
      const distance = +nodeListOfInputs[0].value
      const duration = +nodeListOfInputs[1].value
      const paceOrSpeed = isWorkoutTypeRunning ? duration / distance : distance / (duration / 60)
      const tempOrClimb = +nodeListOfInputs[2].value

      // валідація введених значень
      const type = isWorkoutTypeRunning ? 'running' : 'cycling'

      if (!this._isInputValid(type, distance, duration, tempOrClimb)) {
        this._alertAndFuncOfAlertWindow(e)
        this.currentWorkout.style.zIndex = 'auto'
        return
      }

      // зберігаємо значення з input-ів в value
      nodeListOfValues[0].textContent = distance
      nodeListOfValues[1].textContent = duration
      nodeListOfValues[2].textContent = paceOrSpeed.toFixed(2)
      nodeListOfValues[3].textContent = tempOrClimb

      // зберігаємо відредаговане тренування в масив тренувань і оновлюємо localStorage
      const workoutId = this.currentWorkout.dataset.id
      const workoutInArray = this.#workouts.find(w => w.id == workoutId)
      workoutInArray.distance = distance
      workoutInArray.duration = duration
      workoutInArray[isWorkoutTypeRunning ? 'pace' : 'speed'] = paceOrSpeed
      workoutInArray[isWorkoutTypeRunning ? 'temp' : 'climb'] = tempOrClimb

      this._saveDataOnLocalStorage()

      // з кнопки "Отмена" робимо кнопку "Редактировать"
      this._toggleWorkoutButtons('cancel', 'edit')

      // з кнопки "Подтвердить" робимо кнопку "Удалить"
      this._toggleWorkoutButtons('confirm', 'delete')

      this.currentWorkout.classList.remove('workout--edit')
      overlay.classList.add('hidden')
    }
  }

  _funcOfСancelEditWorkoutBtn() {
    this.currentWorkout.classList.remove('workout--edit')

    // з кнопки "Отмена" робимо кнопку "Редактировать"
    this._toggleWorkoutButtons('cancel', 'edit')

    // з кнопки "Подтвердить" робимо кнопку "Удалить"
    this._toggleWorkoutButtons('confirm', 'delete')
  }

  _showAlertWindow() {
    alertWindow.classList.remove('hidden')
    overlay.classList.remove('hidden')
  }

  _hideAlertWindow() {
    alertWindow.classList.add('hidden')
    overlay.classList.add('hidden')
  }

  _onClickOverlayFunctionality() {
    // натискання на OVERLAY під час редагування тренування при відкритому AlertWindow
    if (
      this.currentWorkout &&
      this.currentWorkout.classList.contains('workout--edit') &&
      !alertWindow.classList.contains('hidden')
    ) {
      this._hideAlertWindowAndShowWorkout.call(this)
      return
    }

    // натискання на OVERLAY при редагуванні тренування (аналогічно до "Отмена")
    if (
      this.currentWorkout &&
      this.currentWorkout.classList.contains('workout--edit') &&
      alertWindow.classList.contains('hidden')
    ) {
      this._funcOfСancelEditWorkoutBtn.call(this)
    }

    // всі інші випадки
    this._hideAlertWindow()
  }

  _hideAlertWindowAndShowWorkout() {
    this.currentWorkout.style.zIndex = '101'
    alertWindow.classList.add('hidden')
  }

  _alertAndFuncOfAlertWindow(e) {
    // контент і функціональність попереджувального вікна:
    const alertWindowContent = alertWindow.querySelector('.alert-window__content')
    const isTargetBtnDelete = e.target.classList.contains('workout__btn--delete')
    const isTargetBtnConfirm = e.target.classList.contains('workout__btn--confirm')

    // кнопка "УДАЛИТЬ ВСЕ ТРЕНИРОВКИ"
    if (e.target === deletionDataBtn) {
      alertWindowContent.textContent = 'Вы действительно хотите удалить все тренировки?'
      alertWindowBtns.addEventListener('click', this._continueOrCancelDeletionData.bind(this), { once: true })
    }

    // кнопка "УДАЛИТЬ" тренування
    if (isTargetBtnDelete) {
      alertWindowContent.textContent = 'Вы действительно хотите удалить данную тренировку?'
      alertWindowBtns.addEventListener('click', this._continueOrCancelDeletionWorkout.bind(this), { once: true })
    }
    alertWindowBtns.innerHTML = `<button class="alert-window__btn btn-cancel">Отмена</button>
    <button class="alert-window__btn btn-continue">Продолжить</button>`

    // кнопка "ОК" в формі або кнопка "ПОДТВЕРДИТЬ" при редагуванні тренування
    if (e.target === form || isTargetBtnConfirm) {
      alertWindowContent.textContent = 'Введите положительные числа!'
      alertWindowBtns.innerHTML = `<button class="alert-window__btn btn-ok">OK</button>`

      isTargetBtnConfirm
        ? alertWindowBtns.addEventListener('click', this._hideAlertWindowAndShowWorkout.bind(this), { once: true })
        : alertWindowBtns.addEventListener('click', this._hideAlertWindow, { once: true })
    }
    // виводимо попереджувальне вікно:
    this._showAlertWindow()
  }

  _continueOrCancelDeletionWorkout(e) {
    const clickBtn = e.target

    // кнопка продовжити
    if (clickBtn.classList.contains('btn-continue')) {
      const workoutId = this.currentWorkout.dataset.id

      const workoutInArrayWorkouts = this.#workouts.find(w => w.id === workoutId)
      this._removeWorkoutFromMap(workoutInArrayWorkouts)

      this.#workouts = this.#workouts.filter(item => item.id !== workoutId)
      this.currentWorkout.remove()
      if (!this.#workouts[0]) {
        deletionDataBtn.classList.add('hidden')
        createWorkoutHint.classList.remove('hidden')
      }
      this._saveDataOnLocalStorage()
    }

    this._hideAlertWindow()
  }

  _continueOrCancelDeletionData(e) {
    const clickBtn = e.target

    // кнопка продовжити
    if (clickBtn.classList.contains('btn-continue')) {
      localStorage.removeItem('workouts')
      location.reload()
    }
    // кнопка скасувати
    if (clickBtn.classList.contains('btn-cancel')) {
      this._hideAlertWindow()
    }
  }
}
const app = new App()
