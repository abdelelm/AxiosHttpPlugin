<template>
    <div v-if="$http.loading > 0" class="loader" v-html="loader" >
    </div>
</template>

<style>
.loader {
    width: 100%;
    height: 100vh;
    position: absolute;
    background-color: rgba(255,255,255,1);
    z-index: 1001;
}
.lds-ellipsis {
 
  margin:auto;
   margin-top: 42vh;
  display: block;
  position: relative;
  width: 64px;
  height: 64px;
}
.lds-ellipsis div {
  position: absolute;
  top: 27px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #000;
  animation-timing-function: cubic-bezier(0, 1, 1, 0);
}
.lds-ellipsis div:nth-child(1) {
  left: 6px;
  animation: lds-ellipsis1 0.6s infinite;
}
.lds-ellipsis div:nth-child(2) {
  left: 6px;
  animation: lds-ellipsis2 0.6s infinite;
}
.lds-ellipsis div:nth-child(3) {
  left: 26px;
  animation: lds-ellipsis2 0.6s infinite;
}
.lds-ellipsis div:nth-child(4) {
  left: 45px;
  animation: lds-ellipsis3 0.6s infinite;
}
@keyframes lds-ellipsis1 {
  0% {
    transform: scale(0);
  }
  100% {
    transform: scale(1);
  }
}
@keyframes lds-ellipsis3 {
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(0);
  }
}
@keyframes lds-ellipsis2 {
  0% {
    transform: translate(0, 0);
  }
  100% {
    transform: translate(19px, 0);
  }
}

</style>
<script>
export default {
    name : "loader",
    props : {
      loader : {
        default : '<div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>'
      }
    },
    data() {
      return {
        app : {},
      }
    },
    created(){
      this.app = document.querySelector("#app");
      if(this.app)
      {
       if(this.$http.loading > 0)
            this.app.style.overflow = 'hidden';
          else
            this.app.style.overflow = 'visible';
      }
      

    }
}
</script>