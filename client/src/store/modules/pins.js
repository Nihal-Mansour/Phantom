import axios from "axios";

const state = {
  pin: "",
  demo: "",
  pins: [],
  first: true,
  savePin: false,
  loading: false,
  isMine: true
};

const mutations = {
  setPins(state, pins) {
    state.pins = pins;
  },
  savePin(state, check) {
    state.savePin = check;
  }
};

const actions = {
  createPin({ state, commit, dispatch }, { pin, label }) {
    commit("popUpsState/toggleLoadingPopup", null, { root: true });
    const file = new FormData();
    file.append("file", pin.imageId);
    axios({
      method: "post",
      url: "me/uploadImage",
      data: file
    })
      .then(response => {
        pin.imageId = response.data[0].id;
        axios.post("me/pins", pin).then(response => {
          state.pin = response.data;
          state.pin.imageId = pin.imageId;
          dispatch("addPinToTopic", {
            pinId: state.pin._id,
            topicName: label
          });
          commit("popUpsState/toggleLoadingPopup", null, { root: true });
          commit("popUpsState/toggleNewPin", null, { root: true });
        });
      })
      .catch(error => {
        commit("popUpsState/toggleLoadingPopup", null, { root: true });
        console.log(error);
      });
  },
  addPinToTopic({ state }, { pinId, topicName }) {
    axios
      .post("topic/addPin", {
        pinId: pinId,
        topicName: topicName
      })
      .then(() => {
        state.demo = "";
      })
      .catch(error => {
        console.log(error);
      });
  },
  getmySavedPins() {
    return axios.get("me/savedPins");
  },
  getmyCreatedPins() {
    return axios.get("me/pins");
  },
  async getMyPins({ dispatch, commit, state }) {
    if (!state.isMine || state.first) {
      state.loading = true;
      state.pins = [];
      state.isMine = true;
      state.first = false;
    }
    let token = localStorage.getItem("userToken");
    axios.defaults.headers.common["Authorization"] = token;
    let mysaved = [];
    let mycreated = [];
    try {
      mysaved = await dispatch("getmySavedPins");
      mysaved = mysaved.data;
    } catch (err) {
      console.log(err);
    }
    try {
      mycreated = await dispatch("getmyCreatedPins");
      mycreated = mycreated.data;
    } catch (err) {
      console.log(err);
    }
    let pins = mysaved.concat(mycreated);

    pins.sort(function(a, b) {
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    commit("setPins", pins);
    state.loading = false;
  },
  getUserPins({ commit, state }, userId) {
    state.pins = [];
    state.loading = true;
    state.isMine = false;
    state.first = false;
    axios
      .get("user/" + userId + "/pins")
      .then(response => {
        commit("setPins", response.data);
        state.loading = false;
      })
      .catch(error => {
        state.loading = false;
        console.log(error);
      });
  },
  savePostInBoard({ commit }, { pinId, boardId }) {
    let token = localStorage.getItem("userToken");
    axios.defaults.headers.common["Authorization"] = token;
    axios
      .post("me/savedPins/" + pinId + "?boardId=" + boardId)
      .then(() => {
        commit("savePin", true);
      })
      .catch(error => {
        console.log(error);
      });
  },
  savePostInSection({ commit }, { pinId, boardId, sectionId }) {
    let token = localStorage.getItem("userToken");
    axios.defaults.headers.common["Authorization"] = token;
    axios
      .post(
        "me/savedPins/" +
          pinId +
          "?boardId=" +
          boardId +
          "&sectionId=" +
          sectionId
      )
      .then(() => {
        commit("savePin", true);
      })
      .catch(error => {
        console.log(error);
      });
  }
};

const getters = {
  pins: state => state.pins,
  loading: state => state.loading
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
};
