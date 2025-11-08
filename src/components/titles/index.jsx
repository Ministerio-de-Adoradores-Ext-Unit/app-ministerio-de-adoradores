import React from 'react';
import { Text, StyleSheet } from 'react-native';

const TitleComponent = ({ title }) => {
  return (
    <Text style={styles.title}>
      {title}
    </Text>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#001F3D',
    textAlign: 'left', 
    marginVertical: 5,
    paddingLeft: '6%',
  },
});

export default TitleComponent;
