import * as React from "react";
import { Image, ImageProperties, ImageRequireSource } from "react-native";
import * as shorthash from "shorthash";
import { FileSystem, Asset } from "expo";
import { State, Source } from "./types";

export default class Picache extends React.Component<ImageProperties, State> {
  state = {
    source: {}
  };
  mount = false;
  async downloadRemoteImage(uri: string) {
    if (!this.mount) { return;}
    const name = shorthash.unique(uri);
    const path = `${FileSystem.cacheDirectory}${name}.png`;
    const image = await FileSystem.getInfoAsync(path);
    if (image.exists) {
      return image.uri;
    }

    const newImage = await FileSystem.downloadAsync(uri, path);
    return newImage.uri;
  }

  async downloadLocalImage(source: ImageRequireSource) {
    if (!this.mount) { return;}
    const asset = await Asset.fromModule(source);
    if (!asset.localUri) {
      await asset.downloadAsync();
    }
    this.setState({
      source: {
        uri: asset.localUri
      }
    });
  }

  async returnNull() {
    return null;
  }

  async downloadImage(source: Source) {
    if (typeof source === "number") {
      // local image require('./image.png')
      this.downloadLocalImage(source);
    } else if (Array.isArray(source)) {
      const newUris = await Promise.all(
        source.map(s => {
          if (s.uri) {
            return this.downloadRemoteImage(s.uri);
          } else {
            return this.returnNull();
          }
        })
      );
      const newSources = [];
      for (let i = 0; i < source.length; i += 1) {
        const uri = newUris[i];
        if (uri) {
          newSources.push({
            ...source[i],
            uri
          });
        }
      }
      if (this.mount) {
        this.setState({
          source: newSources
        });
      }
    } else {
      if (source.uri && this.mount) {
        const newUri = await this.downloadRemoteImage(source.uri);
        this.setState({
          source: {
            ...source,
            uri: newUri
          }
        },() => this.props.onLoadImageCompleted && this.props.onLoadImageCompleted());
      }
    }
  }

  async componentWillReceiveProps(
    nextProps: ImageProperties,
    props: ImageProperties
  ) {
    if (nextProps.source === props.source) {
      return;
    }
    this.downloadImage(nextProps.source);
  }

  async componentDidMount() {
    this.mount = true;
    this.downloadImage(this.props.source);
  }

  async componentWillUnmount() {
    this.mount = false;
  }

  render() {
    const { source, ...otherProps } = this.props;
    return <Image source={this.state.source} {...otherProps} />;
  }
}
