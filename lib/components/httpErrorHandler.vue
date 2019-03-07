<template>
    <div class="error-container">
        <div v-for="(er,i) in this.$notify.errors"   :key="i" :class="'v-alert ' + er.type">
            <i aria-hidden="true" class="v-icon material-icons theme--light v-alert__icon">er.icon</i>
            <div v-html="er.message"></div>
            <a class="v-alert__dismissible" @click="close(er)">
                <i aria-hidden="true" class="v-icon v-icon--right material-icons theme--light">cancel</i>
            </a>
        </div>
    </div>
    
</template>
<style>
.error-container {
    position: fixed;
    bottom: 0;
    right: 0;
    min-width: 300px;
    z-index:1010;
}
</style>

<script>
export default {
    methods : {
        close(el)
        {
            this.$notify.RemoveNotify(el);
        }
    }
}
</script>

<style>

</style>
