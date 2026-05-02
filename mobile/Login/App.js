import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');


  async function sendData(){
    const rawDataLogin = {
      email,
      password
    }

    try {
      const response = await fetch("http://localhost:3000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(rawDataLogin)
      })

      const result = await response.json();

      if (result.access_token){
        Alert.alert("Sucesso", "Deu certo caramba!");
        await AsyncStorage.setItem("token", result.access_token)
        navigation.navigate("Dashboard")
      } else {
        Alert.alert("Erro", "Email ou senha invalidos!");
      }
    } catch (error) {
      console.error("Erro:", error);
      Alert.alert("Erro", "Não foi possível conectar ao servidor.");
    }
  }

  return (
    <View style={styles.container}>

      <View>
        <Text>Email</Text>
        <TextInput
        placeholder='seuemail@gmail.com'
        value={email}
        onChangeText={setEmail}
        />

        <Text>Senha</Text>
        <TextInput
          placeholder='*********'
          value={password}
          onChangeText={setPassword}
        />

        <Pressable onPress={sendData}>
          <Text>Entra no sistema</Text>
        </Pressable>
      
      </View>

      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
