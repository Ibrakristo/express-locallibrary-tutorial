const mongoose = require("mongoose");
const Scehma = mongoose.Schema;

const GenreModel = new Scehma({name:{type:String, required:true, minLength:3,maxLength:100,}})
GenreModel.virtual("url").get(function(){
    return `/catalog/genre/${this._id}`;
})

module.exports = mongoose.model("Genre",GenreModel);